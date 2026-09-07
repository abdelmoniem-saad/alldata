/**
 * C6c: unit tests for the LCS line diff (`lib/lineDiff.ts`), the renderer
 * behind MergeDiff's unified view of a fork's suggested content.
 */

import { describe, expect, it } from 'vitest'
import { lineDiff, type DiffLine } from './lineDiff'

const kinds = (lines: DiffLine[]) => lines.map(l => l.kind)
const texts = (lines: DiffLine[]) => lines.map(l => l.text)

describe('lineDiff', () => {
  it('identical input is all `same`', () => {
    const src = 'a\nb\nc'
    const diff = lineDiff(src, src)
    expect(kinds(diff)).toEqual(['same', 'same', 'same'])
    expect(texts(diff)).toEqual(['a', 'b', 'c'])
  })

  it('pure insertion emits one `add`', () => {
    const diff = lineDiff('a\nc', 'a\nb\nc')
    expect(diff).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'add', text: 'b' },
      { kind: 'same', text: 'c' },
    ])
  })

  it('pure deletion emits one `del`', () => {
    const diff = lineDiff('a\nb\nc', 'a\nc')
    expect(diff).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'same', text: 'c' },
    ])
  })

  it('a replaced line becomes an add/del hunk (add emitted before del)', () => {
    // The backward walk prefers adds when the LCS tie-breaks, so within a
    // replacement hunk the new line precedes the old one. MergeDiff's
    // renderer doesn't care about intra-hunk order.
    const diff = lineDiff('old line', 'new line')
    expect(kinds(diff)).toEqual(['add', 'del'])
    expect(texts(diff)).toEqual(['new line', 'old line'])
  })

  it('empty left: everything is an add', () => {
    const diff = lineDiff('', 'a\nb')
    expect(kinds(diff)).toEqual(['add', 'add'])
    expect(texts(diff)).toEqual(['a', 'b'])
  })

  it('empty right: everything is a del', () => {
    const diff = lineDiff('a\nb', '')
    expect(kinds(diff)).toEqual(['del', 'del'])
    expect(texts(diff)).toEqual(['a', 'b'])
  })

  it('both empty: no lines', () => {
    expect(lineDiff('', '')).toEqual([])
  })

  it('keeps common lines aligned even when far apart (LCS behavior)', () => {
    const diff = lineDiff('x\nkeep\ny', 'x2\nkeep\ny2')
    // 'keep' is the LCS anchor; both sides of it are rewritten hunks in
    // the add-before-del hunk convention.
    expect(diff).toEqual([
      { kind: 'add', text: 'x2' },
      { kind: 'del', text: 'x' },
      { kind: 'same', text: 'keep' },
      { kind: 'add', text: 'y2' },
      { kind: 'del', text: 'y' },
    ])
  })

  it('reconstruction property: same+add rebuilds right, same+del rebuilds left', () => {
    const left = ['## Correlation', '', 'r measures linear association.', ''].join('\n')
    const right = [
      '## Correlation',
      '',
      'r measures *linear* association.',
      '',
      'See: spurious correlations.',
      '',
    ].join('\n')
    const diff = lineDiff(left, right)

    const kept = texts(diff.filter(l => l.kind !== 'del')).join('\n')
    const removed = texts(diff.filter(l => l.kind !== 'add')).join('\n')
    expect(kept).toBe(right)
    expect(removed).toBe(left)

    // The tweaked paragraph is a del/add hunk; the new block is a pure add.
    expect(texts(diff.filter(l => l.kind === 'del'))).toContain('r measures linear association.')
    expect(texts(diff.filter(l => l.kind === 'add'))).toContain('r measures *linear* association.')
    expect(texts(diff.filter(l => l.kind === 'add'))).toContain('See: spurious correlations.')
  })

  it('never emits trailing newline characters in line text', () => {
    const diff = lineDiff('a\n', 'a\nb\n')
    for (const line of diff) {
      expect(line.text.endsWith('\n')).toBe(false)
    }
  })
})
