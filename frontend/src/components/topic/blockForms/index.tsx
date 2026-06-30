/**
 * blockForms, the per-directive editor router.
 *
 * `renderBlockEditor` picks the friendly form for a directive segment, falling
 * back to the raw-source escape hatch for the heavier types (decision,
 * playground, step_through, dataset), so a contributor never sees plumbing on
 * the common blocks, and an expert keeps raw control on the rest. BlockCard
 * stays unchanged regardless.
 */
import { ReactNode } from 'react'
import { DirectiveSegment } from '../../../lib/contentDoc'
import RawBlockEditor from './RawBlockEditor'
import {
  GearForm, LayerForm, CalloutForm, DerivationForm, MisconceptionForm,
  StateForm, GraphViewForm, CodeForm, PlotForm, DecisionForm, PlaygroundForm,
} from './forms'

export interface BlockEditorProps {
  segment: DirectiveSegment
  /** Replace the block's raw source (re-tokenized by the parent on commit). */
  onChange: (raw: string) => void
  /** Parent re-parses the segment to refresh its card label. */
  onBlur?: () => void
  /** Open the shared plot picker (used by the plot form). */
  onOpenPlotPicker?: () => void
}

export function renderBlockEditor(props: BlockEditorProps): ReactNode {
  switch (props.segment.type) {
    case 'gear': return <GearForm {...props} />
    case 'layer': return <LayerForm {...props} />
    case 'callout': return <CalloutForm {...props} />
    case 'derivation': return <DerivationForm {...props} />
    case 'misconception': return <MisconceptionForm {...props} />
    case 'state':
    case 'state_reset': return <StateForm {...props} />
    case 'graph_view': return <GraphViewForm {...props} />
    case 'simulation':
    case 'code_python':
    case 'code_r': return <CodeForm {...props} />
    case 'plot': return <PlotForm {...props} />
    case 'decision': return <DecisionForm {...props} />
    case 'playground': return <PlaygroundForm {...props} />
    // step_through / dataset, raw escape hatch.
    default: return <RawBlockEditor segment={props.segment} onChange={props.onChange} onBlur={props.onBlur} />
  }
}
