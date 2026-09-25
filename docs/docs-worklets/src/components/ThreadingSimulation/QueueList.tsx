import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import type { PendingJob } from '@site/src/simulation';

import styles from './styles.module.css';
import { humanize } from './runtimeColors';

const EXIT_MS = 320;
const MAX_CHIPS = 4;

interface Entry {
  job: PendingJob;
  exitAt: number | null;
}

interface QueueListProps {
  pending: PendingJob[];
  paused?: boolean;
}

export default function QueueList({ pending, paused = false }: QueueListProps) {
  const [entries, setEntries] = useState<Entry[]>(() =>
    pending.map((job) => ({ job, exitAt: null }))
  );
  const shownRef = useRef<Set<number>>(new Set());
  const timersRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const now = Date.now();
    const shown = shownRef.current;
    setEntries((current) => {
      const next: Entry[] = [];
      const seen = new Set<number>();
      for (const entry of current) {
        const stillPending = pending.find((job) => job.id === entry.job.id);
        if (stillPending !== undefined) {
          seen.add(entry.job.id);
          next.push({ job: stillPending, exitAt: null });
        } else if (entry.exitAt !== null) {
          next.push(entry);
        } else if (shown.has(entry.job.id)) {
          next.push({ job: entry.job, exitAt: now + EXIT_MS });
        }
      }
      for (const job of pending) {
        if (!seen.has(job.id)) {
          next.push({ job, exitAt: null });
        }
      }
      return next;
    });
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      const cutoff = Date.now();
      setEntries((current) => {
        const kept = current.filter(
          (entry) => entry.exitAt === null || entry.exitAt > cutoff
        );
        return kept.length === current.length ? current : kept;
      });
    }, EXIT_MS + 20);
    timersRef.current.add(timer);
  }, [pending]);

  useEffect(
    () => () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }
    },
    []
  );

  const visible: Entry[] = [];
  let liveShown = 0;
  for (const entry of entries) {
    if (entry.exitAt !== null) {
      visible.push(entry);
    } else if (liveShown < MAX_CHIPS) {
      visible.push(entry);
      liveShown += 1;
    }
  }
  const live = entries.filter((entry) => entry.exitAt === null).length;
  const hidden = live - liveShown;
  shownRef.current = new Set(
    visible
      .filter((entry) => entry.exitAt === null)
      .map((entry) => entry.job.id)
  );

  return (
    <div className={clsx(styles.queue, paused && styles.queuePaused)}>
      <span className={styles.queueLabel}>
        queue
        {paused && <span className={styles.queuePausedTag}>paused</span>}
      </span>
      <span className={styles.queueChips}>
        {visible.map((entry) => (
          <span
            key={entry.job.id}
            className={clsx(
              styles.queueChip,
              entry.job.pastDue === true && styles.queueChipPastDue,
              entry.exitAt !== null && styles.queueChipExit
            )}
            data-help={
              entry.job.timer === true
                ? 'A pending timer. When it is due, its callback joins this queue as a job.'
                : entry.job.awaiting === true
                  ? 'A job suspended at await. It re-enters the queue when its promise settles.'
                  : entry.job.pastDue === true
                    ? 'A job that is past due: its timer fired, or the press waited longer than a frame, while the thread was busy.'
                    : 'A job waiting for the thread to dequeue it. Jobs run in order, one at a time.'
            }>
            {entry.job.internal
              ? humanize(entry.job.name)
              : `${entry.job.name}()`}
            {entry.job.awaiting === true && ' awaits'}
            {entry.job.pastDue === true && (
              <span className={styles.queueChipNote}>past due</span>
            )}
          </span>
        ))}
        {hidden > 0 && <span className={styles.queueMore}>+{hidden}</span>}
      </span>
    </div>
  );
}
