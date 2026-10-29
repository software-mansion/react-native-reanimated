import React from 'react';

import LaneTimeline from '@site/src/components/LaneTimeline';
import type { TimelineBlock } from '@site/src/components/LaneTimeline';

const DURATION = 9.467;
const TAP = 0.45;
const HANDLER = 0.6;
const TAPS = [0.97, 3.27, 3.9, 4.47, 8.03];
const BUSY_TAP = 2.5;
const BUSY_END = 5.6;

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
  kind: 'handler',
}));

export default function WorkerRuntimeDiagram() {
  return (
    <LaneTimeline
      label="The busy task moved to a Worker Runtime on its own thread"
      duration={DURATION}
      lanes={[
        { title: 'UI thread', accent: 'ui', blocks: taps },
        {
          title: 'JS thread',
          tag: 'RN Runtime',
          accent: 'js',
          blocks: handlers,
        },
        {
          title: 'Worker thread',
          tag: 'Worker Runtime',
          accent: 'worker',
          blocks: [
            {
              from: BUSY_TAP + TAP,
              to: BUSY_END,
              label: 'busyTask',
              kind: 'worker',
            },
          ],
        },
      ]}
      legend={[
        { kind: 'handler', label: 'RN Runtime' },
        { kind: 'worker', label: 'Worker Runtime' },
      ]}
      recording={{
        src: '/recordings/worker-runtime-task.mp4',
        label:
          'Recording: the busy task running on a Worker Runtime while taps stay responsive',
      }}
    />
  );
}
