import React, { useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';

import type { CoreSnapshot, MemorySnapshot } from '@site/src/simulation';

import styles from './styles.module.css';
import { badgeName, runtimeClass, threadName } from './runtimeColors';
import QueueList from './QueueList';
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
  const ordered = [...runtimes].sort((a, b) => memoryRank(a) - memoryRank(b));
  const synchronizables = memory.filter(
    (cell) => cell.kind === 'synchronizable'
  );
  const accessorOf = (cell: MemorySnapshot) =>
    cell.accessedBy === null || !settled
      ? undefined
      : allRuntimes.find((candidate) => candidate.id === cell.accessedBy);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const rectsRef = useRef(new Map<string, DOMRect>());
  const animationsRef = useRef(new Map<string, RunningShift>());
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) {
      return;
    }
    const rects = new Map<string, DOMRect>();
    const rowRect = row.getBoundingClientRect();
    const scale = row.offsetWidth === 0 ? 1 : rowRect.width / row.offsetWidth;
    const relative = (rect: DOMRect) =>
      new DOMRect(
        (rect.left - rowRect.left) / scale,
        (rect.top - rowRect.top) / scale,
        rect.width / scale,
        rect.height / scale
      );
    const pairs = Array.from(row.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.dataset.runtime !== undefined
    );
    const keys = pairs.map((pair) => pair.dataset.runtime as string);
    const membersChanged =
      keys.length !== rectsRef.current.size ||
      keys.some((key) => !rectsRef.current.has(key));
    for (const pair of pairs) {
      const key = pair.dataset.runtime as string;
      const stored = animationsRef.current.get(key);
      const active =
        stored !== undefined && stored.animation.playState === 'running';
      const previous = rectsRef.current.get(key);
      if (!membersChanged) {
        rects.set(
          key,
          active && previous !== undefined
            ? previous
            : relative(pair.getBoundingClientRect())
        );
        continue;
      }
      const visual = relative(pair.getBoundingClientRect());
      const elapsed = stored?.animation.currentTime;
      stored?.animation.cancel();
      animationsRef.current.delete(key);
      const target = relative(pair.getBoundingClientRect());
      rects.set(key, target);
      if (previous === undefined) {
        continue;
      }
      if (active && stored !== undefined && sameRect(previous, target)) {
        const animation = pair.animate(stored.keyframes, SHIFT_OPTIONS);
        animation.currentTime = elapsed ?? 0;
        animationsRef.current.set(key, {
          animation,
          keyframes: stored.keyframes,
        });
        continue;
      }
      const start = active
        ? new DOMRect(
            previous.left + (visual.left - target.left),
            previous.top + (visual.top - target.top),
            visual.width,
            visual.height
          )
        : previous;
      if (sameRect(start, target)) {
        continue;
      }
      const keyframes: Keyframe[] = [
        {
          width: `${start.width}px`,
          transform: `translate(${start.left - target.left}px, ${start.top - target.top}px)`,
        },
        { width: `${target.width}px`, transform: 'translate(0, 0)' },
      ];
      const animation = pair.animate(keyframes, SHIFT_OPTIONS);
      animationsRef.current.set(key, { animation, keyframes });
      animation.finished
        .then(() => {
          if (animationsRef.current.get(key)?.animation === animation) {
            animationsRef.current.delete(key);
          }
        })
        .catch(() => undefined);
    }
    rectsRef.current = rects;
  });
  return (
    <div className={styles.memoryColumn}>
      <div className={styles.vmRow} ref={rowRef}>
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
          const placeholder = !present.has(runtime.id);
          const driving =
            running && executor !== undefined && executor.id === runtime.id;
          return (
            <div
              key={runtime.id}
              data-runtime={runtime.id}
              className={clsx(
                styles.vmPair,
                placeholder && styles.vmPlaceholder
              )}
              aria-hidden={placeholder}>
              <div
                className={clsx(
                  styles.box,
                  styles.vm,
                  styles.vmLoop,
                  runtimeClass(runtime),
                  styles.boxActive,
                  !driving && styles.vmLoopIdle
                )}
                data-help={`The event loop of the ${runtime.label}: its queue of jobs and timers, driven by the ${threadName(runtime)}. It pauses while another thread holds the runtime.`}>
                <span className={styles.boxTitle}>
                  {badgeName(runtime.id)} event loop
                </span>
                <span className={styles.boxDetail}>{threadName(runtime)}</span>
                {error === null && (
                  <QueueList pending={pending} paused={paused} />
                )}
              </div>
              <div
                className={clsx(
                  styles.box,
                  styles.vm,
                  styles.vmRuntime,
                  runtimeClass(executorDescriptor ?? runtime),
                  running && styles.boxActive
                )}
                data-help={`${runtime.label}: a JavaScript heap. A thread must hold it to run JavaScript on it; the box names the thread holding it now. A synchronous call from another thread borrows it.`}>
                <span className={styles.boxTitle}>{runtime.label}</span>
                <span className={styles.boxDetail}>
                  {!running || executorDescriptor === undefined
                    ? 'no thread'
                    : threadName(executorDescriptor)}
                </span>
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
                      <span className={styles.cellNumber}>{cell.value}</span>
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
                {error !== null && (
                  <span className={styles.vmError}>{error}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {synchronizables.length > 0 && (
        <div className={styles.nativeRow}>
          <span className={styles.nativeLabel}>native heap</span>
          {synchronizables.map((cell) => {
            const accessor = accessorOf(cell);
            return (
              <span
                key={`cell-${cell.id}`}
                className={clsx(
                  styles.synchronizable,
                  accessor !== undefined && runtimeClass(accessor),
                  accessor !== undefined && styles.synchronizableActive
                )}
                data-help="A Synchronizable: shared memory in the native heap. Any thread reads or writes it without a cross-runtime call; the colour shows who touched it this tick.">
                <span className={styles.shareableLabel}>Synchronizable</span>
                <span className={styles.cellNumber}>{cell.value}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SHIFT_OPTIONS: KeyframeAnimationOptions = {
  duration: 320,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};

interface RunningShift {
  animation: Animation;
  keyframes: Keyframe[];
}

function sameRect(a: DOMRect, b: DOMRect): boolean {
  return (
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5
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
