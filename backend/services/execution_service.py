"""Code execution service — Docker-based sandboxed code execution.

Architecture:
1. User submits code via API
2. Code is written to a temp file
3. A Docker container runs the code with strict resource limits
4. stdout/stderr are captured and returned
5. Any generated plot images are captured as base64
"""

import asyncio
import base64
import os
import tempfile
import time
from pathlib import Path

from backend.config import settings


MAX_OUTPUT_LENGTH = 50_000  # Characters


async def execute_code(
    code: str,
    language: str = "python",
    timeout: int | None = None,
    theme: str = "dark",
) -> dict:
    """Execute code in an isolated Docker container.

    Returns dict with: stdout, stderr, exit_code, execution_time_ms, images, truncated
    """
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
            except asyncio.TimeoutError:
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
    """Fallback: execute Python locally when Docker is not available (dev mode).

    Uses subprocess.run in a thread to avoid asyncio subprocess issues on Windows.
    """
    import subprocess as sp

    with tempfile.TemporaryDirectory() as tmpdir:
        output_dir = Path(tmpdir) / "output"
        output_dir.mkdir()

        wrapped = _wrap_python_code(code, output_dir=str(output_dir), theme=theme)
        code_path = Path(tmpdir) / "script.py"
        code_path.write_text(wrapped, encoding="utf-8")

        start_time = time.monotonic()

        def _run():
            return sp.run(
                ["python", str(code_path)],
                capture_output=True,
                timeout=timeout,
                cwd=tmpdir,
            )

        loop = asyncio.get_event_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, _run),
                timeout=timeout + 2,
            )
        except (asyncio.TimeoutError, sp.TimeoutExpired):
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

        # The wrapped code references the output dir — re-wrap with the real path
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
            except asyncio.TimeoutError:
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
            # Docker not available or no R image — fall back to local Rscript
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
    """
    import subprocess as sp

    with tempfile.TemporaryDirectory() as tmpdir:
        output_dir = Path(tmpdir) / "output"
        output_dir.mkdir()

        wrapped = _wrap_r_code(code, output_dir=str(output_dir), theme=theme)
        code_path = Path(tmpdir) / "script.R"
        code_path.write_text(wrapped, encoding="utf-8")

        start_time = time.monotonic()

        def _run():
            return sp.run(
                ["Rscript", str(code_path)],
                capture_output=True,
                timeout=timeout,
                cwd=tmpdir,
            )

        loop = asyncio.get_event_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, _run),
                timeout=timeout + 2,
            )
        except (asyncio.TimeoutError, sp.TimeoutExpired):
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
    call auto-rolls to a fresh PNG — users get multiple plots automatically
    from base R graphics. For ggplot2, users must still call `print(plot)`.
    """
    safe_dir = output_dir.replace("\\", "/")
    plot_pattern = f"{safe_dir}/plot_%03d.png"

    is_light = theme == "light"
    bg_color = "#fdfdfd" if is_light else "#0d0d0d"
    fg_color = "#09090b" if is_light else "#e4e4e7"
    axis_color = "#52525b" if is_light else "#a1a1aa"

    return f"""# AllData R runtime — auto-capture plots under Laboratory Monolith theme
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


def _wrap_python_code(code: str, output_dir: str = "/home/sandbox/output", theme: str = "dark") -> str:
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
    plt.savefig(os.path.join(_output_dir, f'plot_{{_plot_counter:03d}}.png'), dpi=100, bbox_inches='tight')
    plt.close()

plt.show = _capture_show

# Run user code
{code}

# Save any remaining figures
for i, fig_num in enumerate(plt.get_fignums(), start=_plot_counter + 1):
    plt.figure(fig_num)
    plt.savefig(os.path.join(_output_dir, f'plot_{{i:03d}}.png'), dpi=100, bbox_inches='tight')
    plt.close(fig_num)
"""
