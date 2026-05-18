/**
 * codePairs — M5.
 *
 * Authors pair two code blocks (Python + R, typically) by giving them the
 * same `pair_id: <slug>` in their directive front-matter. The reader sees a
 * single code surface with two language tabs; switching tabs swaps the
 * code body in place without leaving the section.
 *
 * The grouping is done at the surface level (ScrollReader, SlideView,
 * TourView) so the BlockRenderer dispatch stays one-block-per-call. This
 * helper walks the visible-block list and merges adjacent code blocks that
 * share a `pair_id`. Non-adjacent blocks with matching `pair_id`s do not
 * pair — keeping the grouping local prevents distant blocks from
 * accidentally swallowing intermediate content.
 *
 * The current pairing scope is "two adjacent code blocks." Triples or
 * larger groups aren't supported; if a third block declares the same
 * `pair_id`, it renders as a standalone block.
 */

import type { ContentBlock } from '../../../api/client'

export type CodeLang = 'python' | 'r'

export interface CodePair {
  kind: 'code_pair'
  pairId: string
  /**
   * Two language variants. Order is `[first declared, second declared]` —
   * which sets the visible tab order. Active tab selection is independent;
   * it's stored in `progressStore.preferredCodeLang`.
   */
  variants: Array<{ block: ContentBlock; lang: CodeLang }>
}

export type GroupedBlock = ContentBlock | CodePair

/**
 * Inspect a code block's parsed meta for `pair_id`. Returns the string id
 * or null. The meta map is the same one the surface passes to
 * `BlockRenderer`, so callers don't repeat the JSON.parse.
 */
function pairIdFor(block: ContentBlock, meta: Record<string, unknown> | undefined): string | null {
  if (!isCodeBlock(block)) return null
  const raw = meta?.pair_id
  if (typeof raw !== 'string' || !raw.trim()) return null
  return raw.trim()
}

function isCodeBlock(block: ContentBlock): boolean {
  return (
    block.block_type === 'code_python'
    || block.block_type === 'code_r'
    || block.block_type === 'simulation'
  )
}

function langOf(block: ContentBlock): CodeLang {
  return block.block_type === 'code_r' ? 'r' : 'python'
}

/**
 * Walk the visible-block list. When two adjacent code blocks share a
 * `pair_id`, collapse them into a `CodePair`. Otherwise emit the block
 * verbatim.
 */
export function groupCodePairs(
  blocks: ContentBlock[],
  metaCache: Map<string, Record<string, unknown>>,
): GroupedBlock[] {
  const out: GroupedBlock[] = []
  let i = 0
  while (i < blocks.length) {
    const a = blocks[i]
    const aPair = pairIdFor(a, metaCache.get(a.id))
    const b = i + 1 < blocks.length ? blocks[i + 1] : null
    const bPair = b ? pairIdFor(b, metaCache.get(b.id)) : null
    if (aPair && b && bPair === aPair && langOf(a) !== langOf(b)) {
      out.push({
        kind: 'code_pair',
        pairId: aPair,
        variants: [
          { block: a, lang: langOf(a) },
          { block: b!, lang: langOf(b!) },
        ],
      })
      i += 2
      continue
    }
    out.push(a)
    i += 1
  }
  return out
}

export function isCodePair(b: GroupedBlock): b is CodePair {
  return (b as CodePair).kind === 'code_pair'
}
