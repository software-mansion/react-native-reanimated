import React from 'react';
import clsx from 'clsx';

import type { CoreSnapshot } from '@site/src/simulation';

import styles from './styles.module.css';
import { runtimeClass } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';

interface MemoryPanelProps {
  runtimes: RuntimeDescriptor[];
  present: Set<string>;
  allRuntimes: RuntimeDescriptor[];
  cores: CoreSnapshot[];
  rawToDisplayLine: number[];
  settled: boolean;
  steady: Set<string>;
}

export default function MemoryPanel({
  runtimes,
  present,
  allRuntimes,
  cores,
  rawToDisplayLine,
  settled,
  steady,
}: MemoryPanelProps) {
  return (
    <div className={styles.vmRow}>
      {runtimes.map((runtime) => {
        const executor = cores.find(
          (candidate) =>
            candidate.status === 'running' &&
            candidate.heldRuntimes.includes(runtime.id)
        );
        const executing = executor?.runtime === runtime.id;
        const executorDescriptor =
          executor === undefined
            ? undefined
            : allRuntimes.find((candidate) => candidate.id === executor.id);
        const own = cores.find((candidate) => candidate.id === runtime.id);
        const running =
          executor !== undefined && (settled || steady.has(executor.id));
        const line = executor?.line ?? null;
        const displayLine = line === null ? -1 : (rawToDisplayLine[line] ?? -1);
        const currentFn = executor?.currentFn ?? null;
        const error = own?.error ?? null;
        return (
          <div
            key={runtime.id}
            className={clsx(
              styles.box,
              styles.vm,
              runtimeClass(executorDescriptor ?? runtime),
              running && styles.boxActive,
              !present.has(runtime.id) && styles.vmPlaceholder
            )}
            aria-hidden={!present.has(runtime.id)}>
            <span className={styles.boxTitle}>{runtime.label}</span>
            <span className={styles.boxDetail}>
              {executor !== undefined && executor.id !== runtime.id
                ? `acquired by the ${executorDescriptor?.thread ?? executor.id}`
                : runtime.thread}
            </span>
            {error !== null && <span className={styles.vmError}>{error}</span>}
            {error === null && (
              <span className={styles.vmStatus}>
                {running
                  ? executing
                    ? displayLine > 0
                      ? `line ${displayLine}`
                      : executor?.nativeFrame
                        ? 'native code'
                        : 'framework code'
                    : 'claimed'
                  : 'idle'}
                {running &&
                  executing &&
                  currentFn !== null &&
                  ` · ${currentFn}`}
              </span>
            )}
            {own !== undefined && own.callStack.length > 1 && (
              <span className={styles.vmList}>
                stack: {own.callStack.join(' › ')}
              </span>
            )}
            {own !== undefined &&
              own.microtasks.length + own.queue.length > 0 && (
                <span className={styles.vmList}>
                  queue: {[...own.microtasks, ...own.queue].join(', ')}
                </span>
              )}
          </div>
        );
      })}
    </div>
  );
}
