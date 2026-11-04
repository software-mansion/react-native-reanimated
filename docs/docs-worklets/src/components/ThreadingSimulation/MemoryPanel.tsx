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
import FlashValue from './FlashValue';
import GuestLinks from './GuestLinks';
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
  const accessorOf = (cell: MemorySnapshot) =>
    cell.accessedBy === null || !settled
      ? undefined
      : allRuntimes.find((candidate) => candidate.id === cell.accessedBy);
  return (
    <div className={styles.memoryWrap}>
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
            const variables = memory.filter(
              (cell) => cell.kind === 'variable' && cell.host === runtime.id
            );
            const heapOwner = running ? executorDescriptor : undefined;
            const globals = Object.entries(own?.globals ?? {});
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
                {(globals.length > 0 ||
                  variables.length > 0 ||
                  shareables.length > 0 ||
                  guests.length > 0) && (
                  <div className={clsx(styles.vmSection, styles.vmHeap)}>
                    <span className={styles.vmSectionTitle}>JS heap</span>
                    <div className={styles.memoryCells}>
                      {globals.map(([name, value]) => (
                        <span
                          key={`global-${name}`}
                          data-memory-kind="global"
                          className={clsx(
                            styles.shareable,
                            styles.heapCell,
                            value.length > 12 && styles.globalCell,
                            heapOwner !== undefined && runtimeClass(heapOwner),
                            heapOwner !== undefined && styles.shareableActive
                          )}
                          data-help={`\`globalThis.${name}\` lives in this runtime's JS heap. Only code running on this runtime can read or write it.`}>
                          <span className={styles.shareableLabel}>
                            globalThis.{name}
                          </span>
                          <FlashValue
                            className={
                              value.length > 12
                                ? styles.globalValue
                                : styles.cellNumber
                            }
                            value={value}
                          />
                        </span>
                      ))}
                      {variables.map((cell) => {
                        return (
                          <span
                            key={`variable-${cell.id}`}
                            data-memory-kind="variable"
                            className={clsx(
                              styles.shareable,
                              styles.heapCell,
                              heapOwner !== undefined &&
                                runtimeClass(heapOwner),
                              heapOwner !== undefined && styles.shareableActive
                            )}
                            data-help={`The variable \`${cell.name}\` lives in this runtime's JS heap. Only code running on this runtime can read or write it.`}>
                            <span className={styles.shareableLabel}>
                              {cell.name}
                            </span>
                            <FlashValue
                              className={styles.cellNumber}
                              value={cell.value}
                            />
                          </span>
                        );
                      })}
                      {shareables.map((cell) => {
                        return (
                          <span
                            key={`shareable-${cell.id}`}
                            data-shareable-host={cell.id}
                            className={clsx(
                              styles.shareable,
                              styles.heapCell,
                              heapOwner !== undefined &&
                                runtimeClass(heapOwner),
                              heapOwner !== undefined && styles.shareableActive
                            )}
                            data-help="A Shareable Host: the value lives in this runtime. Only the thread holding this runtime reads or writes it directly.">
                            <span className={styles.shareableLabel}>
                              Shareable Host
                            </span>
                            <FlashValue
                              className={styles.cellNumber}
                              value={cell.value}
                            />
                          </span>
                        );
                      })}
                      {guests.map((cell) => {
                        return (
                          <span
                            key={`guest-${cell.id}`}
                            data-shareable-guest={cell.id}
                            className={clsx(
                              styles.shareable,
                              styles.heapCell,
                              styles.shareableGuest,
                              heapOwner !== undefined &&
                                runtimeClass(heapOwner),
                              heapOwner !== undefined && styles.shareableActive
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
              </div>
            );
          })}
        </div>
        {nativeCells.length > 0 && (
          <div className={styles.nativeRow} data-sim-layout-key="native-memory">
            <div className={styles.nativeHeader}>
              <span className={styles.nativeLabel}>Native heap</span>
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
                      {serializable ? (
                        'Serializable (immutable)'
                      ) : (
                        <>
                          Synchronizable
                          <span className={styles.valueType}>
                            {cell.fixed ? 'fixed' : 'dynamic'}
                          </span>
                          {cell.lockedBy !== null && (
                            <span
                              className={clsx(
                                styles.valueType,
                                styles.lockBadge
                              )}
                              data-help="The Synchronizable is locked. Other threads wait in getBlocking, setBlocking, setDirty and lock until the holder calls unlock.">
                              locked · {badgeName(cell.lockedBy)}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    {serializable || cell.fixed ? (
                      <FlashValue
                        className={styles.cellNumber}
                        value={cell.value}
                      />
                    ) : (
                      <span
                        className={styles.innerSerializable}
                        data-help={`The value of a Synchronizable is stored as a Serializable, here of type ${cell.valueType}.`}>
                        <span className={styles.shareableLabel}>
                          Serializable
                          <span className={styles.valueType}>
                            {cell.valueType}
                          </span>
                        </span>
                        <FlashValue
                          className={styles.cellNumber}
                          value={cell.value}
                        />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </AnimatedGrid>
      {memory.some(
        (cell) => cell.kind === 'shareable' && cell.guests.length > 0
      ) && <GuestLinks />}
    </div>
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
