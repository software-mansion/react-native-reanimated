import React from 'react';
import clsx from 'clsx';

import type { CoreSnapshot } from '@site/src/simulation';

import styles from './styles.module.css';
import { runtimeClass, threadName } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';

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
  return (
    <div className={styles.coreGrid}>
      {[...runtimes]
        .sort((a, b) => {
          const rank = (runtime: RuntimeDescriptor) =>
            runtime.kind === 'rn'
              ? 0
              : runtime.kind === 'ui'
                ? 1
                : runtime.coreIndex + 2;
          return rank(a) - rank(b);
        })
        .map((runtime) => {
          const core = cores.find((candidate) => candidate.id === runtime.id);
          const running = core?.status === 'running';
          const blockedOn =
            core?.waitingFor == null
              ? undefined
              : (runtimes.find((candidate) => candidate.id === core.waitingFor)
                  ?.label ?? core.waitingFor);
          return (
            <div
              key={runtime.id}
              data-sim-node={`thread:${runtime.id}`}
              className={clsx(
                styles.box,
                styles.core,
                runtimeClass(runtime),
                running && styles.boxActive,
                blockedOn !== undefined && styles.coreBlocked
              )}>
              <div className={styles.coreHeader}>
                <span className={styles.boxTitle} data-sim-port>
                  {threadName(runtime)}
                </span>
                <span className={styles.coreStatus}>
                  {blockedOn !== undefined
                    ? 'Waiting'
                    : running
                      ? 'Running'
                      : core?.status === 'error'
                        ? 'Stopped'
                        : 'Idle'}
                </span>
              </div>
              {blockedOn !== undefined && (
                <div className={styles.coreLine}>
                  <span className={styles.coreLineText}>
                    Waiting for {blockedOn}
                  </span>
                </div>
              )}
              {blockedOn === undefined && (
                <div className={styles.coreLine}>
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
    return 'Ready for the next job';
  }
  if (core.status === 'error') {
    return core.error ?? 'Execution stopped';
  }
  const displayLine =
    core.line === null ? -1 : (rawToDisplayLine[core.line] ?? -1);
  if (displayLine < 0) {
    return core.nativeFrame ? 'Native code' : 'Framework code';
  }
  return core.currentFn === null
    ? `Line ${displayLine}`
    : `${core.currentFn} · line ${displayLine}`;
}
