import os, re, sys
root = os.path.dirname(os.path.abspath(__file__))
bad = []
for dirpath, _, files in os.walk(root):
    if "meta.yaml" not in files:
        continue
    p = os.path.join(dirpath, "meta.yaml")
    with open(p, encoding="utf-8") as f:
        lines = f.readlines()
    for ln in lines:
        m = re.match(r"^(summary|title):\s*(.*)$", ln)
        if not m:
            continue
        val = m.group(2).strip()
        if val and not val.startswith(('"', "'")) and ": " in val:
            bad.append((os.path.relpath(p, root), ln.strip()))
for rel, line in bad:
    print(f"{rel}: {line}")
print(f"TOTAL UNQUOTED COLON LINES: {len(bad)}")
sys.exit(0)
