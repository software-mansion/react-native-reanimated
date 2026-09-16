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

const TICK_SPEEDS = [
  { ms: 0, label: '0 ms' },
  { ms: 10, label: '10 ms' },
  { ms: 100, label: '100 ms' },
  { ms: 250, label: '250 ms' },
  { ms: 500, label: '500 ms' },
  { ms: 1000, label: '1 s' },
];

const INITIAL_SCREEN = {
  tree: {
    type: 'View',
    props: {},
    children: [
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
        <div className={styles.speed} role="group" aria-label="Tick speed">
          <span className={styles.speedLabel}>tick</span>
          {TICK_SPEEDS.map((speed) => (
            <button
              key={speed.ms}
              type="button"
              className={clsx(
                styles.speedOption,
                speed.ms === tickMs && styles.speedOptionActive
              )}
              onClick={() => setTickMs(speed.ms)}
              aria-pressed={speed.ms === tickMs}>
              {speed.label}
            </button>
          ))}
        </div>
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
