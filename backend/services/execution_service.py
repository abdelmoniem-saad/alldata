"""Code execution service — Docker-based sandboxed code execution.

Architecture:
1. User submits code via API
2. Code is written to a temp file
3. A Docker container runs the code with strict resource limits
4. stdout/stderr are captured and returned
5. Any generated plot images are captured as base64

When Docker isn't reachable, execution falls back to running on the host
interpreter (the Hugging Face Space can't nest Docker). Y1 hardens that
fallback: a scrubbed environment (no SECRET_KEY / DATABASE_URL / tokens),
an absolute dataset dir so `load(name)` works without a favorable cwd,
POSIX rlimits + process-group kill on timeout, and a global concurrency
gate so heavy runs can't starve the single-process host.
"""

import asyncio
import base64
import os
import shutil
import signal
import sys
import tempfile
import time
from pathlib import Path

from backend.config import settings

MAX_OUTPUT_LENGTH = 50_000  # Characters

# ── Y1: local-fallback hardening ─────────────────────────────────────────
# Absolute path to the curated CSVs, passed to the child via env so the
# injected `load(name)` helper resolves datasets regardless of the process
# cwd (the fallback runs in a throwaway temp dir).
_DATASET_DIR = Path(__file__).resolve().parent.parent.parent / "seed" / "datasets"


def _sandbox_env(home: str) -> dict[str, str]:
    """Allow-list environment for the local-fallback child process.

    The child must never see server secrets (SECRET_KEY, DATABASE_URL,
    REDIS_URL, proxy credentials) — it's running untrusted code on this
    host. Only the keys the interpreter and matplotlib genuinely need are
    inherited; everything else is dropped.
    """
    env = {
        "PATH": os.environ.get("PATH", os.defpath),
        "HOME": home,
        "MPLBACKEND": "Agg",
        "PYTHONUNBUFFERED": "1",
        "ALLODATA_DATASET_DIR": str(_DATASET_DIR),
        # Y3/A7: single-threaded BLAS/OpenMP inside the fallback. OpenBLAS
        # reserves large *virtual* mappings per thread, which (a) blows
        # through the RLIMIT_AS cap and dies with "OpenBLAS error: Memory
        # allocation still failed after 10 retries", and (b) oversubscribes
        # the Space's few vCPUs — the concurrency gate already bounds how
        # many simulations run at once.
        "OPENBLAS_NUM_THREADS": "1",
        "OMP_NUM_THREADS": "1",
        "MKL_NUM_THREADS": "1",
        "NUMEXPR_NUM_THREADS": "1",
    }
    for key in (
        "SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "COMSPEC", "PATHEXT",
        "APPDATA", "LOCALAPPDATA", "USERPROFILE", "HOMEDRIVE", "HOMEPATH",
        "LANG", "LC_ALL",
    ):
        if key in os.environ:
            env[key] = os.environ[key]
    return env


def _child_hardening_kwargs(timeout: int) -> dict:
    """POSIX-only pre-exec hardening for the local-fallback subprocess.

    CPU time is capped just above the wall-clock timeout (the kernel sends
    SIGKILL even if our own timeout bookkeeping loses the race), file size
    is capped so a write loop can't fill the disk, and (Linux only) address
    space is capped — RLIMIT_AS misbehaves on macOS with modern CPython.
    `start_new_session` puts the child in its own process group so the
    timeout killer can take down grandchildren, not just the direct child.
    """
    if os.name != "posix":
        return {}
    import resource  # POSIX only

    limits: list[tuple[int, tuple[int, int]]] = [
        (resource.RLIMIT_CPU, (timeout, timeout + 1)),
        (resource.RLIMIT_FSIZE, (64 * 1024 * 1024, 64 * 1024 * 1024)),
        (resource.RLIMIT_NPROC, (64, 64)),
    ]
    if sys.platform == "linux":
        mem = int(settings.sandbox_local_memory_mb) * 1024 * 1024
        limits.append((resource.RLIMIT_AS, (mem, mem)))

    def _preexec():  # pragma: no cover — runs in the forked child
        for res, (soft, hard) in limits:
            try:
                resource.setrlimit(res, (soft, hard))
            except (ValueError, OSError):
                pass

    return {"preexec_fn": _preexec, "start_new_session": True}


def _kill_process_group(proc) -> None:
    """Y1: kill the whole process group, not just the direct child, so a
    forked grandchild can't outlive the timeout."""
    try:
        if hasattr(os, "killpg"):
            # start_new_session ⇒ the child is its own group leader, so its
            # pid doubles as the pgid.
            os.killpg(proc.pid, signal.SIGKILL)
        else:
            proc.kill()
    except (ProcessLookupError, PermissionError, OSError):
        try:
            proc.kill()
        except OSError:
            pass


# Y1: one global concurrency gate. The Docker sandbox already bounds each
# run; this bounds how many runs the *host* executes at once, which matters
# on the single-CPU Hugging Face tier where the local fallback competes with
# uvicorn itself. Created at import; asyncio primitives bind their loop lazily.
_execution_slots = asyncio.Semaphore(settings.execution_max_concurrent)



def runtime_capabilities() -> dict:
    """V0: which languages can actually run in this deployment.

    Python is always available (the sandbox/host has numpy/pandas/matplotlib).
    R is reported runnable only when there's a *real* R runtime: `Rscript` on
    PATH (local fallback), or `SANDBOX_R_ENABLED` set by a deployment that has
    built the sandbox-r image (W0). Docker being present is *not* sufficient,
    the base sandbox image ships no R, so probing for `docker` alone would
    re-create the "R is not installed" dead end the UI is trying to avoid.
    """
    r_available = bool(shutil.which("Rscript")) or settings.sandbox_r_enabled
    return {"python": True, "r": r_available}


def _fallback_refused() -> dict:
    """S1: the Docker sandbox is unavailable and unsandboxed local execution
    is disabled (`SANDBOX_ALLOW_LOCAL_FALLBACK=false`). Refuse loudly rather
    than run untrusted code on the host."""
    return {
        "stdout": "",
        "stderr": (
            "Code execution is unavailable: the sandbox isn't running and "
            "local fallback is disabled on this server."
        ),
        "exit_code": -1,
        "execution_time_ms": 0,
        "images": [],
        "truncated": False,
    }


async def execute_code(
    code: str,
    language: str = "python",
    timeout: int | None = None,
    theme: str = "dark",
) -> dict:
    """Execute code in an isolated Docker container.

    Returns dict with: stdout, stderr, exit_code, execution_time_ms, images, truncated

    Y1: all dispatch paths run under the global concurrency gate so a burst
    of heavy runs can't starve the host process.
    """
    async with _execution_slots:
        timeout = timeout or settings.sandbox_timeout_seconds

        if language == "python":
            return await _execute_python(code, timeout, theme)
        elif language == "r":
            return await _execute_r(code, timeout, theme)
        else:
            return {
                "stdout": "",
                "stderr": f"Unsupported language: {language}",
                "exit_code": 1,
                "execution_time_ms": 0,
                "images": [],
                "truncated": False,
            }


async def _execute_python(code: str, timeout: int, theme: str = "dark") -> dict:
    """Execute Python code in a sandboxed Docker container."""
    # Wrap the code to capture matplotlib plots
    wrapped_code = _wrap_python_code(code, theme=theme)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Write the code to a file
        code_path = Path(tmpdir) / "script.py"
        code_path.write_text(wrapped_code, encoding="utf-8")

        # Output directory for plots
        output_dir = Path(tmpdir) / "output"
        output_dir.mkdir()

        start_time = time.monotonic()

        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "run",
                "--rm",
                "--network=none",
                f"--memory={settings.sandbox_memory_limit}",
                f"--cpus={settings.sandbox_cpu_limit}",
                "--read-only",
                "--tmpfs", "/tmp:size=50m",
                # Y1: curated datasets, read-only, so the injected `load(name)`
                # helper works inside the sandbox too (previously it only
                # worked when the cwd happened to contain seed/datasets).
                "-v", f"{_DATASET_DIR}:/home/sandbox/datasets:ro",
                "-e", "ALLODATA_DATASET_DIR=/home/sandbox/datasets",
                # A7: same BLAS-thread pinning as the local fallback — under
                # --cpus=0.5, a 64-thread OpenBLAS pool is pure overhead.
                "-e", "OPENBLAS_NUM_THREADS=1",
                "-e", "OMP_NUM_THREADS=1",
                "-e", "MKL_NUM_THREADS=1",
                "-v", f"{code_path}:/home/sandbox/script.py:ro",
                "-v", f"{output_dir}:/home/sandbox/output",
                settings.sandbox_image,
                "python", "/home/sandbox/script.py",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except TimeoutError:
                proc.kill()
                await proc.wait()
                return {
                    "stdout": "",
                    "stderr": f"Execution timed out after {timeout} seconds",
                    "exit_code": -1,
                    "execution_time_ms": int((time.monotonic() - start_time) * 1000),
                    "images": [],
                    "truncated": False,
                }

        except (FileNotFoundError, NotImplementedError, OSError):
            # Docker not available or asyncio subprocess not supported (Windows)
            if not settings.sandbox_allow_local_fallback:
                return _fallback_refused()
            return await _execute_local_python(code, timeout, theme)

        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        stdout_text = stdout.decode("utf-8", errors="replace")
        stderr_text = stderr.decode("utf-8", errors="replace")
        truncated = False

        if len(stdout_text) > MAX_OUTPUT_LENGTH:
            stdout_text = stdout_text[:MAX_OUTPUT_LENGTH] + "\n... (output truncated)"
            truncated = True

        # Collect any generated plot images
        images = []
        for img_file in sorted(output_dir.glob("*.png")):
            img_data = img_file.read_bytes()
            images.append(base64.b64encode(img_data).decode("ascii"))

        return {
            "stdout": stdout_text,
            "stderr": stderr_text,
            "exit_code": proc.returncode or 0,
            "execution_time_ms": elapsed_ms,
            "images": images,
            "truncated": truncated,
        }


async def _execute_local_python(code: str, timeout: int, theme: str = "dark") -> dict:
    """Fallback: execute Python locally when Docker is not available (dev mode / HF).

    Uses subprocess.Popen in a thread to avoid asyncio subprocess issues on
    Windows. Y1: the child runs with a scrubbed environment, POSIX rlimits,
    its own process group (killed whole-group on timeout), and `sys.executable`
    so it's guaranteed to be the same interpreter/venv the server runs on.
    """
    import subprocess as sp

    # ignore_cleanup_errors: after a timeout kill, the dying child may still
    # hold handles in its (own) temp dir for a beat — Windows raises
    # PermissionError on cleanup, which would otherwise 500 the response
    # *after* the result was already computed. The dir lives in %TEMP% and
    # the OS reaps it.
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        output_dir = Path(tmpdir) / "output"
        output_dir.mkdir()

        wrapped = _wrap_python_code(code, output_dir=str(output_dir), theme=theme)
        code_path = Path(tmpdir) / "script.py"
        code_path.write_text(wrapped, encoding="utf-8")

        start_time = time.monotonic()

        def _run():
            proc = sp.Popen(
                [sys.executable, str(code_path)],
                stdout=sp.PIPE,
                stderr=sp.PIPE,
                cwd=tmpdir,
                env=_sandbox_env(home=tmpdir),
                **_child_hardening_kwargs(timeout),
            )
            try:
                stdout, stderr = proc.communicate(timeout=timeout)
            except sp.TimeoutExpired:
                _kill_process_group(proc)
                raise
            return sp.CompletedProcess(proc.args, proc.returncode, stdout, stderr)

        loop = asyncio.get_event_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, _run),
                timeout=timeout + 2,
            )
        except (TimeoutError, sp.TimeoutExpired):
            return {
                "stdout": "",
                "stderr": f"Execution timed out after {timeout} seconds",
                "exit_code": -1,
                "execution_time_ms": int((time.monotonic() - start_time) * 1000),
                "images": [],
                "truncated": False,
            }

        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        stdout_text = result.stdout.decode("utf-8", errors="replace")
        stderr_text = result.stderr.decode("utf-8", errors="replace")
        truncated = len(stdout_text) > MAX_OUTPUT_LENGTH

        if truncated:
            stdout_text = stdout_text[:MAX_OUTPUT_LENGTH] + "\n... (output truncated)"

        # Collect any generated plot images
        images = []
        for img_file in sorted(output_dir.glob("*.png")):
            img_data = img_file.read_bytes()
            images.append(base64.b64encode(img_data).decode("ascii"))

        return {
            "stdout": stdout_text,
            "stderr": stderr_text,
            "exit_code": result.returncode or 0,
            "execution_time_ms": elapsed_ms,
            "images": images,
            "truncated": truncated,
        }


async def _execute_r(code: str, timeout: int, theme: str = "dark") -> dict:
    """Execute R code. Tries Docker sandbox first, then local Rscript fallback.

    For the local path, `Rscript` must be on PATH; otherwise we return a
    friendly install hint instead of a cryptic FileNotFoundError.
    """
    wrapped_code = _wrap_r_code(code, theme=theme)

    with tempfile.TemporaryDirectory() as tmpdir:
        code_path = Path(tmpdir) / "script.R"
        output_dir = Path(tmpdir) / "output"
        output_dir.mkdir()

        # The wrapped code references the output dir, re-wrap with the real path
        wrapped_code = _wrap_r_code(code, output_dir=str(output_dir), theme=theme)
        code_path.write_text(wrapped_code, encoding="utf-8")

        start_time = time.monotonic()

        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "run",
                "--rm",
                "--network=none",
                f"--memory={settings.sandbox_memory_limit}",
                f"--cpus={settings.sandbox_cpu_limit}",
                "--read-only",
                "--tmpfs", "/tmp:size=50m",
                "-v", f"{code_path}:/home/sandbox/script.R:ro",
                "-v", f"{output_dir}:/home/sandbox/output",
                settings.sandbox_r_image,
                "Rscript", "/home/sandbox/script.R",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except TimeoutError:
                proc.kill()
                await proc.wait()
                return {
                    "stdout": "",
                    "stderr": f"Execution timed out after {timeout} seconds",
                    "exit_code": -1,
                    "execution_time_ms": int((time.monotonic() - start_time) * 1000),
                    "images": [],
                    "truncated": False,
                }

        except (FileNotFoundError, NotImplementedError, OSError):
            # Docker not available or no R image, fall back to local Rscript
            if not settings.sandbox_allow_local_fallback:
                return _fallback_refused()
            return await _execute_local_r(code, timeout, theme)

        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        stdout_text = stdout.decode("utf-8", errors="replace")
        stderr_text = stderr.decode("utf-8", errors="replace")
        truncated = False

        if len(stdout_text) > MAX_OUTPUT_LENGTH:
            stdout_text = stdout_text[:MAX_OUTPUT_LENGTH] + "\n... (output truncated)"
            truncated = True

        images = []
        for img_file in sorted(output_dir.glob("*.png")):
            img_data = img_file.read_bytes()
            images.append(base64.b64encode(img_data).decode("ascii"))

        return {
            "stdout": stdout_text,
            "stderr": stderr_text,
            "exit_code": proc.returncode or 0,
            "execution_time_ms": elapsed_ms,
            "images": images,
            "truncated": truncated,
        }


async def _execute_local_r(code: str, timeout: int, theme: str = "dark") -> dict:
    """Fallback: execute R code locally via Rscript when Docker isn't available.

    Requires `Rscript` on PATH. Returns a helpful setup hint if R isn't installed.
    Y1: scrubbed environment + POSIX rlimits + process-group kill, matching the
    Python fallback.
    """
    import subprocess as sp

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        output_dir = Path(tmpdir) / "output"
        output_dir.mkdir()

        wrapped = _wrap_r_code(code, output_dir=str(output_dir), theme=theme)
        code_path = Path(tmpdir) / "script.R"
        code_path.write_text(wrapped, encoding="utf-8")

        start_time = time.monotonic()

        def _run():
            proc = sp.Popen(
                ["Rscript", str(code_path)],
                stdout=sp.PIPE,
                stderr=sp.PIPE,
                cwd=tmpdir,
                env=_sandbox_env(home=tmpdir),
                **_child_hardening_kwargs(timeout),
            )
            try:
                stdout, stderr = proc.communicate(timeout=timeout)
            except sp.TimeoutExpired:
                _kill_process_group(proc)
                raise
            return sp.CompletedProcess(proc.args, proc.returncode, stdout, stderr)

        loop = asyncio.get_event_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, _run),
                timeout=timeout + 2,
            )
        except (TimeoutError, sp.TimeoutExpired):
            return {
                "stdout": "",
                "stderr": f"Execution timed out after {timeout} seconds",
                "exit_code": -1,
                "execution_time_ms": int((time.monotonic() - start_time) * 1000),
                "images": [],
                "truncated": False,
            }
        except FileNotFoundError:
            return {
                "stdout": "",
                "stderr": (
                    "R is not installed on this machine. Install R "
                    "(https://cran.r-project.org/) and make sure `Rscript` is on "
                    "your PATH to run R code here."
                ),
                "exit_code": -1,
                "execution_time_ms": 0,
                "images": [],
                "truncated": False,
            }

        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        stdout_text = result.stdout.decode("utf-8", errors="replace")
        stderr_text = result.stderr.decode("utf-8", errors="replace")
        truncated = len(stdout_text) > MAX_OUTPUT_LENGTH

        if truncated:
            stdout_text = stdout_text[:MAX_OUTPUT_LENGTH] + "\n... (output truncated)"

        images = []
        for img_file in sorted(output_dir.glob("*.png")):
            img_data = img_file.read_bytes()
            images.append(base64.b64encode(img_data).decode("ascii"))

        return {
            "stdout": stdout_text,
            "stderr": stderr_text,
            "exit_code": result.returncode or 0,
            "execution_time_ms": elapsed_ms,
            "images": images,
            "truncated": truncated,
        }


def _wrap_r_code(code: str, output_dir: str = "/home/sandbox/output", theme: str = "dark") -> str:
    """Wrap R code to auto-capture plots.

    Opens a png() device with a `%03d` filename pattern so each `plot.new()`
    call auto-rolls to a fresh PNG, users get multiple plots automatically
    from base R graphics. For ggplot2, users must still call `print(plot)`.
    """
    safe_dir = output_dir.replace("\\", "/")
    plot_pattern = f"{safe_dir}/plot_%03d.png"

    is_light = theme == "light"
    bg_color = "#fdfdfd" if is_light else "#0d0d0d"
    fg_color = "#09090b" if is_light else "#e4e4e7"
    axis_color = "#52525b" if is_light else "#a1a1aa"

    return f"""# AllData R runtime, auto-capture plots under Laboratory Monolith theme
tryCatch({{
  png(filename = "{plot_pattern}", width = 900, height = 550, bg = "{bg_color}")
  par(
    bg = "{bg_color}",
    fg = "{fg_color}",
    col.axis = "{axis_color}",
    col.lab = "{axis_color}",
    col.main = "{fg_color}",
    mar = c(4.5, 4.5, 3, 1),
    family = "sans"
  )
}}, error = function(e) {{}})

# --- user code ---
{code}
# --- end user code ---

# Flush any open plot devices so the final page actually writes
tryCatch({{
  while (!is.null(dev.list())) dev.off()
}}, error = function(e) {{}})
"""


def _wrap_python_code(
    code: str, output_dir: str = "/home/sandbox/output", theme: str = "dark"
) -> str:
    """Wrap user code to capture matplotlib plots automatically."""
    # Normalize path separators for the target OS
    safe_dir = output_dir.replace("\\", "/")

    # Theme parameters
    is_light = theme == "light"
    face_color = "#fdfdfd" if is_light else "#050505"
    text_color = "#09090b" if is_light else "#ffffff"
    label_color = "#52525b" if is_light else "#a1a1aa"
    tick_color = "#a1a1aa" if is_light else "#52525b"
    edge_color = "#e4e4e7" if is_light else "#262626"
    grid_color = "#f4f4f5" if is_light else "#1a1a1a"

    return f"""
import os
import sys

_output_dir = r"{safe_dir}"

# Redirect matplotlib to save plots instead of showing them and apply Laboratory Monolith theme
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Laboratory Monolith theme for plots
plt.rcParams.update({{
    'figure.facecolor': '{face_color}',
    'axes.facecolor': '{face_color}',
    'text.color': '{text_color}',
    'axes.labelcolor': '{label_color}',
    'xtick.color': '{tick_color}',
    'ytick.color': '{tick_color}',
    'axes.edgecolor': '{edge_color}',
    'grid.color': '{grid_color}',
    'axes.spines.top': False,
    'axes.spines.right': False,
    'font.family': 'sans-serif',
    'font.sans-serif': ['Inter', 'DejaVu Sans'],
}})

_plot_counter = 0
_original_show = plt.show

def _capture_show(*args, **kwargs):
    global _plot_counter
    _plot_counter += 1
    plt.savefig(
        os.path.join(_output_dir, f'plot_{{_plot_counter:03d}}.png'),
        dpi=100,
        bbox_inches='tight',
    )
    plt.close()

plt.show = _capture_show

# K5: load(name), read a curated dataset by name. Returns the rows as a
# list of dicts, one dict per CSV row, with real bools and numbers where
# the CSV allows it. One shape for topic code regardless of whether pandas
# is installed: iterating gives rows, row["col"] works, and
# pd.DataFrame(load(name)) still builds a DataFrame. Path is resolved
# relative to wherever uvicorn runs from, matching
# seed/datasets/{{name}}.csv. Slug-shaped names only.
import re as _re_load
def load(name):
    if not _re_load.fullmatch(r"[A-Za-z0-9_-]+", str(name)):
        raise ValueError("Invalid dataset name: " + repr(name))
    candidates = []
    # Y1: the runner tells us exactly where the curated CSVs live (local
    # fallback runs in a temp cwd; the Docker sandbox mounts them read-only).
    _dataset_dir = os.environ.get("ALLODATA_DATASET_DIR")
    if _dataset_dir:
        candidates.append(os.path.join(_dataset_dir, str(name) + ".csv"))
    for d in (os.getcwd(), "/app", "/work", "/home/sandbox/datasets"):
        candidates.append(os.path.join(d, "seed", "datasets", str(name) + ".csv"))
    p = os.getcwd()
    for _ in range(4):
        candidates.append(os.path.join(p, "seed", "datasets", str(name) + ".csv"))
        p = os.path.dirname(p)
    for path in candidates:
        if os.path.exists(path):
            try:
                import pandas as _pd
                # to_dict("records") yields real Python scalars per row
                # (True stays True, 3 stays 3), which the CSV fallback
                # below recreates with _coerce_cell for the no-pandas path.
                return _pd.read_csv(path).to_dict("records")
            except ImportError:
                import csv as _csv
                with open(path, encoding="utf-8") as _f:
                    rows = list(_csv.DictReader(_f))
                for _row in rows:
                    for _k in _row:
                        _row[_k] = _coerce_cell(_row[_k])
                return rows
    raise FileNotFoundError("Dataset " + repr(name) + " not found")

def _coerce_cell(val):
    # Match pandas' dtype inference closely enough for topic code:
    # booleans as real bools, numeric strings as numbers, else the string.
    if val is None:
        return None
    if val == "True":
        return True
    if val == "False":
        return False
    try:
        return int(val)
    except (TypeError, ValueError):
        pass
    try:
        return float(val)
    except (TypeError, ValueError):
        return val

# Run user code
{code}

# Save any remaining figures
for i, fig_num in enumerate(plt.get_fignums(), start=_plot_counter + 1):
    plt.figure(fig_num)
    plt.savefig(os.path.join(_output_dir, f'plot_{{i:03d}}.png'), dpi=100, bbox_inches='tight')
    plt.close(fig_num)
"""
