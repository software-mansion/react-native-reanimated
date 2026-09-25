import React from 'react';

import LaneTimeline from '@site/src/components/LaneTimeline';
import type { TimelineBlock } from '@site/src/components/LaneTimeline';

const DURATION = 9.467;
const TAP = 0.45;
const HANDLER = 0.6;
const TAPS = [0.97, 3.27, 3.87, 4.47, 8.03];
const BUSY_TAP = 2.5;
const BUSY_END = 5.63;

const taps: TimelineBlock[] = [...TAPS, BUSY_TAP].map((time) => ({
  from: time,
  to: time + TAP,
  label: 'tap',
  kind: 'tap',
}));

const handlers: TimelineBlock[] = TAPS.map((time) => ({
  from: time + TAP,
  to: time + TAP + HANDLER,
  label: 'onTap',
  kind: 'ui',
  row: 1,
}));

export default function UIRuntimeDiagram() {
  return (
    <LaneTimeline
      label="The tap handler running on the UI Runtime on the UI thread"
      duration={DURATION}
      lanes={[
        {
          title: 'UI thread',
          tag: 'UI Runtime',
          accent: 'ui',
          rows: 2,
          blocks: [...taps, ...handlers],
        },
        {
          title: 'JS thread',
          tag: 'RN Runtime',
          accent: 'js',
          blocks: [
            {
              from: BUSY_TAP + TAP,
              to: BUSY_END,
              label: 'busyTask',
              kind: 'busy',
            },
          ],
        },
      ]}
      legend={[
        { kind: 'busy', label: 'RN Runtime' },
        { kind: 'ui', label: 'UI Runtime' },
      ]}
      recording={{
        src: '/recordings/ui-runtime-handler.mp4',
        label:
          'Recording: taps handled on the UI Runtime while the JS thread is busy',
      }}
    />
  );
}
