import React from 'react';
import clsx from 'clsx';

import type { CoreSnapshot, MemorySnapshot } from '@site/src/simulation';

import styles from './styles.module.css';
import {
  badgeName,
  displayName,
  runtimeClass,
  threadName,
} from './runtimeColors';
import QueueList from './QueueList';
import AnimatedGrid from './AnimatedGrid';
import type { RuntimeDescriptor } from './runtimeColors';

interface MemoryPanelProps {
  runtimes: RuntimeDescriptor[];
  present: Set<string>;
  allRuntimes: RuntimeDescriptor[];
  cores: CoreSnapshot[];
  memory: MemorySnapshot[];
  settled: boolean;
  steady: Set<string>;
}

export default function MemoryPanel({
  runtimes,
  present,
  allRuntimes,
  cores,
  memory,
  settled,
  steady,
}: MemoryPanelProps) {
  const ordered = runtimes
    .filter((runtime) => present.has(runtime.id))
    .sort((a, b) => memoryRank(a) - memoryRank(b));
  const nativeCells = memory.filter(
    (cell) => cell.kind === 'synchronizable' || cell.kind === 'serializable'
  );
  const showGlobals = cores.some(
    (core) => Object.keys(core.globals).length > 0
  );
  const accessorOf = (cell: MemorySnapshot) =>
    cell.accessedBy === null || !settled
      ? undefined
      : allRuntimes.find((candidate) => candidate.id === cell.accessedBy);
  return (
    <AnimatedGrid
      animateResize
      className={styles.memoryColumn}
      layoutKey={`${ordered.map((runtime) => runtime.id).join(',')}:${nativeCells.length > 0}`}
      itemSelector="[data-sim-layout-key]">
      <div className={styles.vmRow}>
        {ordered.map((runtime) => {
          const executor = cores.find(
            (candidate) =>
              candidate.status === 'running' &&
              candidate.heldRuntimes.includes(runtime.id)
          );
          const executorDescriptor =
            executor === undefined
              ? undefined
              : allRuntimes.find((candidate) => candidate.id === executor.id);
          const own = cores.find((candidate) => candidate.id === runtime.id);
          const running =
            executor !== undefined && (settled || steady.has(executor.id));
          const pending = own?.pending ?? [];
          const error = own?.error ?? null;
          const paused =
            running && executor !== undefined && executor.id !== runtime.id;
          const shareables = memory.filter(
            (cell) => cell.kind === 'shareable' && cell.host === runtime.id
          );
          const guests = memory.filter(
            (cell) =>
              cell.kind === 'shareable' && cell.guests.includes(runtime.id)
          );
          return (
            <div
              key={runtime.id}
              data-runtime={runtime.id}
              data-sim-layout-key={`runtime:${runtime.id}`}
              data-sim-node={`runtime:${runtime.id}`}
              className={clsx(
                styles.box,
                styles.vm,
                running &&
                  executorDescriptor !== undefined &&
                  runtimeClass(executorDescriptor),
                running && styles.boxActive
              )}>
              <div className={styles.vmHeader}>
                <span className={styles.boxTitle} data-sim-port>
                  {displayName(runtime)}
                </span>
                <span className={styles.vmOwner}>
                  {!running || executorDescriptor === undefined
                    ? 'Available'
                    : `Owner: ${threadName(executorDescriptor)}`}
                </span>
              </div>
              <div
                className={clsx(
                  styles.vmSection,
                  styles.vmLoop,
                  runtimeClass(runtime),
                  running && !paused && styles.vmLoopActive
                )}>
                <div className={styles.vmSectionHeader}>
                  <span className={styles.vmSectionTitle}>
                    {badgeName(runtime.id)} event loop
                  </span>
                  <span className={styles.boxDetail}>
                    {threadName(runtime)}
                  </span>
                </div>
                {error === null && (
                  <QueueList pending={pending} paused={paused} />
                )}
                {error !== null && (
                  <span className={styles.vmError}>{error}</span>
                )}
              </div>
              {showGlobals && (
                <div className={styles.vmSection}>
                  <span className={styles.vmSectionTitle}>Globals</span>
                  <div className={styles.memoryCells}>
                    {Object.entries(own?.globals ?? {}).map(([name, value]) => (
                      <span
                        key={name}
                        className={clsx(styles.shareable, styles.globalCell)}>
                        <span className={styles.shareableLabel}>{name}</span>
                        <span className={styles.globalValue}>{value}</span>
                      </span>
                    ))}
                    {Object.keys(own?.globals ?? {}).length === 0 && (
                      <span className={styles.boxDetail}>
                        No globals defined
                      </span>
                    )}
                  </div>
                </div>
              )}
              {(shareables.length > 0 || guests.length > 0) && (
                <div className={styles.vmSection}>
                  <span className={styles.vmSectionTitle}>Memory</span>
                  <div className={styles.memoryCells}>
                    {shareables.map((cell) => {
                      const accessor = accessorOf(cell);
                      return (
                        <span
                          key={`shareable-${cell.id}`}
                          className={clsx(
                            styles.shareable,
                            accessor !== undefined && runtimeClass(accessor),
                            accessor !== undefined && styles.shareableActive
                          )}
                          data-help="A Shareable Host: the value lives in this runtime. Only the thread holding this runtime reads or writes it directly.">
                          <span className={styles.shareableLabel}>
                            Shareable Host
                          </span>
                          <span className={styles.cellNumber}>
                            {cell.value}
                          </span>
                        </span>
                      );
                    })}
                    {guests.map((cell) => {
                      const accessor = accessorOf(cell);
                      const active =
                        accessor !== undefined && accessor.id === runtime.id;
                      return (
                        <span
                          key={`guest-${cell.id}`}
                          className={clsx(
                            styles.shareable,
                            styles.shareableGuest,
                            active && runtimeClass(accessor),
                            active && styles.shareableActive
                          )}
                          data-help={`A Shareable Guest: a handle to the value hosted on the ${badgeName(cell.host!)} Runtime. This runtime reads it with getSync (borrowing the host) or getAsync (a job on the host).`}>
                          <span className={styles.shareableLabel}>
                            Shareable Guest
                          </span>
                          <span className={styles.shareableHost}>
                            {badgeName(cell.host!)}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {nativeCells.length > 0 && (
        <div className={styles.nativeRow} data-sim-layout-key="native-memory">
          <div className={styles.nativeHeader}>
            <span className={styles.nativeLabel}>native heap</span>
            <span className={styles.boxDetail}>Accessible from any thread</span>
          </div>
          <div className={styles.memoryCells}>
            {nativeCells.map((cell) => {
              const accessor = accessorOf(cell);
              const serializable = cell.kind === 'serializable';
              return (
                <span
                  key={`cell-${cell.id}`}
                  data-memory-kind={cell.kind}
                  className={clsx(
                    styles.synchronizable,
                    accessor !== undefined && runtimeClass(accessor),
                    accessor !== undefined && styles.synchronizableActive
                  )}
                  data-help={
                    serializable
                      ? 'A Serializable: an immutable serialized value in native memory. Deserializing it on another runtime creates a separate JavaScript value.'
                      : 'A Synchronizable: shared memory in the native heap. Any thread reads or writes it without a cross-runtime call; the colour shows who touched it this tick.'
                  }>
                  <span className={styles.shareableLabel}>
                    {serializable
                      ? 'Serializable (immutable)'
                      : 'Synchronizable'}
                  </span>
                  <span className={styles.cellNumber}>{cell.value}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </AnimatedGrid>
  );
}

function memoryRank(runtime: RuntimeDescriptor): number {
  if (runtime.kind === 'rn') {
    return 0;
  }
  if (runtime.kind === 'ui') {
    return 1;
  }
  return 2 + runtime.coreIndex;
}
