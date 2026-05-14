/**
 * branchFilter — L2 shared utility.
 *
 * Drop blocks tagged `depends_on: <anchor>, branch: <id>` whose decision
 * the user didn't pick. Untagged blocks always render — branching is opt-in.
 *
 * `branch` may be a single id or `|`-separated ids ("a|c") for "show if any
 * of these picks was made."
 *
 * Extracted from `ScrollReader.tsx` in L2 so SlideView (and any future
 * reading surface) can apply the same filter. Otherwise branch-tagged
 * callouts/derivations/etc. would render regardless of decision state in
 * the alternate surface, contradicting the I-cycle contract.
 */

import { ContentBlock } from '../../../api/client'

export function applyBranchFilter(
  blocks: ContentBlock[],
  metaCache: Map<string, Record<string, unknown>>,
  decisions: Record<string, string>,
): ContentBlock[] {
  return blocks.filter(b => {
    const meta = metaCache.get(b.id)
    if (!meta) return true
    const dep = meta.depends_on
    const branch = meta.branch
    if (typeof dep !== 'string' || typeof branch !== 'string') return true
    const picked = decisions[dep]
    if (!picked) return false
    const allowed = branch.split('|').map(s => s.trim()).filter(Boolean)
    return allowed.includes(picked)
  })
}

/** Parse a `ContentBlock.meta` JSON string. Safe on null / malformed. */
export function parseMeta(block: ContentBlock): Record<string, unknown> {
  if (!block.meta) return {}
  try {
    const parsed = JSON.parse(block.meta)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
