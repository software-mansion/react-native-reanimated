import React from 'react';

import LaneTimeline from '@site/src/components/LaneTimeline';
import type {
  BlockKind,
  TimelineBlock,
  TimelineLane,
} from '@site/src/components/LaneTimeline';

import { FRAMES } from './frames';

const FRAME_MS = 1000 / 60;
const SLOWDOWN = 16;
const WARMUP_MS = 1000 / SLOWDOWN;
const LEAD_MS = FRAME_MS / 2 + WARMUP_MS;

type Mode = keyof typeof FRAMES;

const VSYNCS: Record<Mode, number> = {
  idle: 16,
  busy: 16,
  ui: 16,
  uibusy: 32,
};
type Span = readonly [number, number];

interface FrameSyncDiagramProps {
  mode: Mode;
}

const LABELS: Record<Mode, string> = {
  idle: 'Frame callbacks during 16 native frames with an idle JS thread',
  busy: 'Frame callbacks during 16 native frames with a busy JS thread',
  ui: 'UI thread frame callbacks during 16 native frames with a busy JS thread',
  uibusy: 'Frame callbacks during 16 native frames with a busy UI thread',
};

const NATIVE = {
  kind: 'frame',
  label: 'Native frame queue execution',
} as const;
const RN = {
  kind: 'rnFrame',
  label: 'RN Runtime rAF queue execution',
} as const;
const BUSY = { kind: 'busyTask', label: 'Busy JavaScript task' } as const;
const UI = {
  kind: 'uiFrame',
  label: 'UI Runtime rAF queue execution',
} as const;

const LEGENDS: Record<Mode, { kind: BlockKind; label: string }[]> = {
  idle: [NATIVE, RN],
  busy: [NATIVE, RN, BUSY],
  ui: [NATIVE, UI, RN, BUSY],
  uibusy: [NATIVE, UI, RN],
};

export default function FrameSyncDiagram({ mode }: FrameSyncDiagramProps) {
  return (
    <LaneTimeline
      name={`FrameSyncDiagram ${mode}`}
      label={LABELS[mode]}
      duration={durationOf(mode)}
      lanes={lanesFor(mode)}
      legend={LEGENDS[mode]}
      recording={{
        src: `/recordings/event-loop-${mode}.mp4`,
        label: `Recording: ${LABELS[mode].toLowerCase()}, slowed down ${SLOWDOWN} times`,
      }}
    />
  );
}

function lanesFor(mode: Mode): TimelineLane[] {
  const frames = FRAMES[mode];
  const busy = toBlocks(frames.busy, 'busyTask');
  if (mode === 'ui' || mode === 'uibusy') {
    return [
      {
        title: 'UI thread',
        accent: 'ui',
        blocks: [
          ...toBlocks(frames.ui, 'uiFrame'),
          ...toBlocks(frames.native, 'frame'),
        ],
      },
      {
        title: 'JS thread',
        accent: 'js',
        blocks: [...busy, ...toBlocks(frames.rn, 'rnFrame')],
      },
    ];
  }
  return [
    {
      title: 'UI thread',
      accent: 'ui',
      blocks: toBlocks(frames.native, 'frame'),
    },
    {
      title: 'JS thread',
      accent: 'js',
      blocks: [...busy, ...toBlocks(frames.rn, 'rnFrame')],
    },
  ];
}

function durationOf(mode: Mode) {
  const windowMs = VSYNCS[mode] * FRAME_MS + 2 * WARMUP_MS;
  return (windowMs / 1000) * SLOWDOWN;
}

function toBlocks(spans: readonly Span[], kind: BlockKind): TimelineBlock[] {
  return spans.map(([from, to]) => ({
    from: toSeconds(from),
    to: toSeconds(to),
    label: '',
    kind,
  }));
}

function toSeconds(ms: number) {
  return ((ms + LEAD_MS) / 1000) * SLOWDOWN;
}
