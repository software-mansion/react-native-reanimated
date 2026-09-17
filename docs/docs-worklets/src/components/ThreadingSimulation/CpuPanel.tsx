import React from 'react';
import clsx from 'clsx';

import type { CoreSnapshot } from '@site/src/simulation';

import styles from './styles.module.css';
import { runtimeClass, shortName, threadName } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';

export const CORE_COUNT = 4;

interface CpuPanelProps {
  runtimes: RuntimeDescriptor[];
  cores: CoreSnapshot[];
  rawToDisplayLine: number[];
}

export default function CpuPanel({
  runtimes,
  cores,
  rawToDisplayLine,
}: CpuPanelProps) {
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
      {slots.map(({ index, runtime, core, running }) => {
        const blockedOn =
          core?.waitingFor == null
            ? undefined
            : (runtimes.find((candidate) => candidate.id === core.waitingFor)
                ?.label ?? core.waitingFor);
        return (
          <div
            key={index}
            className={clsx(
              styles.box,
              styles.core,
              runtime !== undefined && runtimeClass(runtime),
              running && styles.boxActive,
              blockedOn !== undefined && styles.coreBlocked
            )}
            data-help={
              runtime === undefined
                ? 'An unused core.'
                : `${threadName(runtime)}: a thread. It shows the function and line it executes this tick, or why it is blocked. It holds its runtime while executing JavaScript.`
            }>
            <span className={styles.boxTitle}>Core {index}</span>
            {runtime !== undefined && (
              <span className={styles.boxDetail}>
                {threadName(runtime)}
                {runtime.kind === 'worker' && (
                  <span className={styles.coreNote}>
                    {' '}
                    · {shortName(runtime.id)}
                  </span>
                )}
              </span>
            )}
            {runtime !== undefined && blockedOn !== undefined && (
              <div className={styles.coreLine}>
                <span className={styles.blockedTag}>blocked</span>
                <span className={styles.coreLineText}>
                  waiting for {blockedOn}
                </span>
              </div>
            )}
            {runtime !== undefined && blockedOn === undefined && (
              <div className={styles.coreLine}>
                <span className={styles.queueLabel}>executing</span>
                <span className={styles.coreLineText}>
                  {describeExecution(core, rawToDisplayLine)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function describeExecution(
  core: CoreSnapshot | undefined,
  rawToDisplayLine: number[]
): string {
  if (core === undefined || core.status === 'idle') {
    return 'idle';
  }
  if (core.status === 'error') {
    return 'stopped';
  }
  const displayLine =
    core.line === null ? -1 : (rawToDisplayLine[core.line] ?? -1);
  if (displayLine < 0) {
    return core.nativeFrame ? 'native code' : 'framework code';
  }
  return core.currentFn === null
    ? `:${displayLine}`
    : `${core.currentFn}:${displayLine}`;
}
