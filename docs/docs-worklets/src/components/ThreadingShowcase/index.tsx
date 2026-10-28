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

const BOOT_TICKS = 4;
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
  tickMs = 100,
}: ThreadingShowcaseProps) {
  const [enabled, setEnabled] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const variant = enabled ? worklets : single;

  return (
    <div className={styles.showcase}>
      <div className={styles.bar}>
        <button
          type="button"
          className={clsx(styles.toggle, enabled && styles.toggleOn)}
          onClick={() => setEnabled((current) => !current)}
          aria-pressed={enabled}>
          {!enabled && <span className={styles.spark} aria-hidden="true" />}
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
        </button>
        <span className={styles.hint}>
          {enabled
            ? 'four runtimes, four threads'
            : 'everything runs on the JS thread'}
        </span>
      </div>
      <ThreadingSimulation
        module={variant.module}
        source={variant.source}
        uiRuntime={enabled}
        bootTicks={BOOT_TICKS}
        phone
        pressHandler={enabled ? 'onPress' : 'handlePress'}
        screen={INITIAL_SCREEN}
        alwaysOn
        showControls={false}
        collapsibleCode
        codeColumns={2}
        boilerplateToggle={false}
        codeOpen={codeOpen}
        onCodeOpenChange={setCodeOpen}
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
        durationTicks={durationTicks}
        tickMs={tickMs}
      />
    </div>
  );
}
