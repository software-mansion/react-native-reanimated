import React from 'react';
import clsx from 'clsx';

import type { CoreSnapshot } from '@site/src/simulation';

import styles from './styles.module.css';
import { humanize, runtimeClass, shortName } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';

export const CORE_COUNT = 4;
const MAX_CHIPS = 3;

interface CpuPanelProps {
  runtimes: RuntimeDescriptor[];
  cores: CoreSnapshot[];
}

export default function CpuPanel({ runtimes, cores }: CpuPanelProps) {
  const slots = Array.from({ length: CORE_COUNT }, (_, index) => {
    const runtime = runtimes[index];
    const core =
      runtime === undefined
        ? undefined
        : cores.find((candidate) => candidate.id === runtime.id);
    const running = core?.status === 'running';
    return { index, runtime, core, running };
  });

  return (
    <div className={styles.coreGrid}>
      {slots.map(({ index, runtime, core, running }) => (
        <div
          key={index}
          className={clsx(
            styles.box,
            styles.core,
            runtime !== undefined && runtimeClass(runtime),
            running && styles.boxActive
          )}>
          <span className={styles.boxTitle}>Core {index}</span>
          {runtime !== undefined && (
            <span className={styles.boxDetail}>
              {runtime.kind === 'worker'
                ? shortName(runtime.id)
                : runtime.thread}
            </span>
          )}
          {runtime !== undefined && (
            <div className={styles.queue}>
              <span className={styles.queueLabel}>queue</span>
              {core === undefined || core.pending.length === 0 ? (
                <span className={styles.queueEmpty}>empty</span>
              ) : (
                <span className={styles.queueChips}>
                  {core.pending.slice(0, MAX_CHIPS).map((job, position) => (
                    <span
                      key={`${job.name}-${position}`}
                      className={clsx(
                        styles.queueChip,
                        job.internal && styles.queueChipInternal
                      )}>
                      {job.internal ? humanize(job.name) : `${job.name}()`}
                    </span>
                  ))}
                  {core.pending.length > MAX_CHIPS && (
                    <span className={styles.queueMore}>
                      +{core.pending.length - MAX_CHIPS}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
