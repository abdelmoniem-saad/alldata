#!/usr/bin/env bash
# Smoke-test every authored R block. Run once right after building the
# sandbox-r image (the R was authored without a local R runtime, so this is
# the first real execution check). Catches syntax + runtime errors; plots are
# harmlessly redirected to a scratch device.
#
#   ./infra/smoke_r.sh                  # uses local Rscript
#   RUNNER=docker ./infra/smoke_r.sh    # uses alldata-sandbox-r:latest
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"

python3 - "$ROOT" "$TMP" << 'PY'
import sys, glob, os, re
root, tmp = sys.argv[1], sys.argv[2]
i = 0
for f in sorted(glob.glob(os.path.join(root, 'seed/topics/**/content.md'), recursive=True)):
    txt = open(f, encoding='utf-8').read()
    for m in re.finditer(r'<!--\s*block:\s*code_r[^>]*-->\s*```r\n(.*?)\n```', txt, re.DOTALL):
        i += 1
        topic = os.path.basename(os.path.dirname(f))
        open(os.path.join(tmp, f"{i:03d}_{topic}.R"), 'w', encoding='utf-8').write(m.group(1))
print(f"extracted {i} R blocks")
PY

fail=0; total=0
for rfile in "$TMP"/*.R; do
  total=$((total+1))
  name="$(basename "$rfile")"
  if [ "${RUNNER:-local}" = "docker" ]; then
    out="$(docker run --rm --network=none --tmpfs /tmp:size=50m \
           -v "$rfile:/s.R:ro" alldata-sandbox-r:latest Rscript /s.R 2>&1)"; rc=$?
  else
    out="$(cd "$TMP" && Rscript "$name" 2>&1)"; rc=$?
  fi
  if [ $rc -ne 0 ]; then
    echo "FAIL  $name"
    printf '%s\n' "$out" | tail -3 | sed 's/^/      /'
    fail=$((fail+1))
  else
    echo "ok    $name"
  fi
done
echo "---"
echo "$((total-fail))/$total R blocks ran clean; $fail failures"
rm -rf "$TMP"
exit $fail
