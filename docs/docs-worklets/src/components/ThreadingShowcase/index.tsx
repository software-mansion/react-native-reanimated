import React, { useState } from 'react';
import clsx from 'clsx';

import type { SnippetModule } from '@site/src/simulation';
import ThreadingSimulation from '@site/src/components/ThreadingSimulation';

import styles from './styles.module.css';

interface Variant {
  module: SnippetModule;
  source: string;
}

interface ThreadingShowcaseProps {
  single: Variant;
  worklets: Variant;
  durationTicks?: number;
  tickMs?: number;
}

const TICK_STEP_MS = 50;
const TICK_MIN_MS = 16;
const TICK_MAX_MS = 1000;

function snapTick(value: number): number {
  if (value < TICK_STEP_MS) {
    return TICK_MIN_MS;
  }
  return Math.min(TICK_MAX_MS, Math.round(value / TICK_STEP_MS) * TICK_STEP_MS);
}

function formatTick(ms: number): string {
  return ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`;
}

const INITIAL_SCREEN = {
  tree: {
    type: 'View',
    props: {},
    children: [
      { type: 'Speaker', props: { nativeID: 'speaker' }, children: [] },
      { type: 'Feed', props: { nativeID: 'feed' }, children: [] },
      { type: 'Spinner', props: { nativeID: 'spinner' }, children: [] },
      {
        type: 'Text',
        props: { nativeID: 'article', small: true },
        children: ['README.md'],
      },
      {
        type: 'Button',
        props: { title: 'You pressed me 0 times', nativeID: 'counter' },
        children: [],
      },
    ],
  },
};

export default function ThreadingShowcase({
  single,
  worklets,
  durationTicks = 2137,
  tickMs: initialTickMs = 100,
}: ThreadingShowcaseProps) {
  const [enabled, setEnabled] = useState(false);
  const [tickMs, setTickMs] = useState(initialTickMs);
  const [codeOpen, setCodeOpen] = useState(false);
  const variant = enabled ? worklets : single;

  return (
    <div className={styles.showcase}>
      <div className={styles.bar}>
        <button
          type="button"
          className={clsx(styles.toggle, enabled && styles.toggleOn)}
          onClick={() => setEnabled((current) => !current)}
          aria-pressed={enabled}>
          <span className={styles.switch} aria-hidden="true" />
          <span className={styles.label}>
            <span>{enabled ? 'Worklets enabled' : 'Enable Worklets'}</span>
            <span className={styles.labelGhost} aria-hidden="true">
              Worklets enabled
            </span>
            <span className={styles.labelGhost} aria-hidden="true">
              Enable Worklets
            </span>
          </span>
          {!enabled && <span className={styles.spark} aria-hidden="true" />}
        </button>
        <span className={styles.hint}>
          {enabled
            ? 'four runtimes, four threads'
            : 'everything runs on the JS thread'}
        </span>
        <label className={styles.speed}>
          <span className={styles.speedLabel}>tick</span>
          <input
            type="range"
            className={styles.speedSlider}
            min={TICK_MIN_MS}
            max={TICK_MAX_MS}
            step={1}
            value={tickMs}
            onChange={(event) =>
              setTickMs(snapTick(Number(event.target.value)))
            }
            aria-label="Tick length in milliseconds"
          />
          <span className={styles.speedValue}>{formatTick(tickMs)}</span>
        </label>
      </div>
      <ThreadingSimulation
        key={enabled ? 'worklets' : 'single'}
        module={variant.module}
        source={variant.source}
        uiRuntime={enabled}
        phone
        pressHandler={enabled ? 'onPress' : 'handlePress'}
        screen={INITIAL_SCREEN}
        alwaysOn
        collapsibleCode
        codeColumns={2}
        boilerplateToggle={false}
        codeOpen={codeOpen}
        onCodeOpenChange={setCodeOpen}
        durationTicks={durationTicks}
        tickMs={tickMs}
      />
    </div>
  );
}
