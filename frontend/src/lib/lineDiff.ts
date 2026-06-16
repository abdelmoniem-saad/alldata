/**
 * lineDiff — O1.
 *
 * A minimal LCS-based line diff. Given two multi-line strings, returns a
 * sequence of `{ kind, text }` entries where `kind` is one of:
 *
 *   - `'same'`  — a line present in both, unchanged.
 *   - `'add'`   — a line in `right` not in `left` at this position.
 *   - `'del'`   — a line in `left` not in `right` at this position.
 *
 * Used by `MergeDiff` to render a unified diff between a master topic's
 * current `content.md` and a fork's suggested replacement. Quadratic in
 * line count (LCS), which is fine for content.md-sized inputs.
 */

export type DiffLineKind = 'same' | 'add' | 'del'

export interface DiffLine {
  kind: DiffLineKind
  text: string
}

export function lineDiff(left: string, right: string): DiffLine[] {
  // Split on \n and keep blank trailing lines if present (so the diff
  // mirrors the source exactly). Lines never carry trailing '\n's in
  // the returned list — the renderer adds spacing as needed.
  const a = left.split('\n')
  const b = right.split('\n')
  const m = a.length
  const n = b.length

  // LCS length table.
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1])
      }
    }
  }

  // Walk back from (m, n), emitting `same` for matched lines and the
  // appropriate `add` / `del` for divergences. Build the result in
  // reverse and flip at the end.
  const rev: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      rev.push({ kind: 'same', text: a[i - 1] })
      i--
      j--
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      rev.push({ kind: 'del', text: a[i - 1] })
      i--
    } else {
      rev.push({ kind: 'add', text: b[j - 1] })
      j--
    }
  }
  while (i > 0) {
    rev.push({ kind: 'del', text: a[i - 1] })
    i--
  }
  while (j > 0) {
    rev.push({ kind: 'add', text: b[j - 1] })
    j--
  }

  rev.reverse()
  return rev
}
