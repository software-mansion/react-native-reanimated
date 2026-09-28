import React from 'react';

import LaneTimeline from '@site/src/components/LaneTimeline';
import type { TimelineBlock } from '@site/src/components/LaneTimeline';

const DURATION = 9.5;
const TAP = 0.45;
const HANDLER = 0.6;
const TAPS = [1.0, 3.3, 3.9, 4.5, 8.05];
const BUSY_TAP = 2.55;
const BUSY_END = 5.7;

const taps: TimelineBlock[] = [...TAPS, BUSY_TAP].map((time) => ({
  from: time,
  to: time + TAP,
  label: 'tap',
  kind: 'tap',
}));

export default function SameThreadRuntimeDiagram() {
  return (
    <LaneTimeline
      label="The tap handler moved to a second runtime that still runs on the JS thread"
      duration={DURATION}
      lanes={[
        { title: 'UI thread', accent: 'ui', blocks: taps },
        {
          title: 'JS thread',
          tag: 'RN Runtime + new Runtime',
          accent: 'js',
          blocks: [
            { from: 1.5, to: 1.5 + HANDLER, label: 'onTap', kind: 'ui' },
            {
              from: BUSY_TAP + TAP,
              to: BUSY_END,
              label: 'busyTask',
              kind: 'busy',
            },
            {
              from: BUSY_END,
              to: BUSY_END + HANDLER,
              label: 'onTap ×3',
              kind: 'ui',
            },
            { from: 8.55, to: 8.55 + HANDLER, label: 'onTap', kind: 'ui' },
          ],
        },
      ]}
      legend={[
        { kind: 'busy', label: 'RN Runtime' },
        { kind: 'ui', label: 'new Runtime' },
      ]}
    />
  );
}
