import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

import RecordingPhone from '@site/src/components/RecordingPhone';
import styles from './styles.module.css';

const DURATION = 9.5;
const TAP = 0.5;
const HANDLER = 0.85;
const TAP_BEFORE = 1.0;
const BUSY_TAP = 2.55;
const BUSY_END = 5.7;
const TAPS_QUEUED = [3.3, 3.9, 4.5];
const TAP_AFTER = 8.05;

const BUSY = { from: BUSY_TAP + TAP, to: BUSY_END };

const at = (seconds: number) => `${(seconds / DURATION) * 100}%`;
const span = (seconds: number) => `${(seconds / DURATION) * 100}%`;

export default function BusyThreadDiagram() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lanesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const lanes = lanesRef.current;
    if (video === null || lanes === null) {
      return;
    }
    let frame = 0;
    const follow = () => {
      const total =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : DURATION;
      lanes.style.setProperty('--playhead', String(video.currentTime / total));
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <figure
      className={styles.figure}
      aria-label="A touch event waiting for a busy JS thread">
      <div className={styles.layout}>
        <div className={styles.scene}>
          <div className={styles.lanes} ref={lanesRef}>
            <section className={clsx(styles.lane, styles.ui)}>
              <span className={styles.title}>UI thread</span>
              <div className={styles.track}>
                {[TAP_BEFORE, ...TAPS_QUEUED, TAP_AFTER].map((time) => (
                  <span
                    key={time}
                    className={clsx(styles.block, styles.tapBlock)}
                    style={{ left: at(time), width: span(TAP) }}>
                    tap
                  </span>
                ))}
                <span
                  className={clsx(
                    styles.block,
                    styles.tapBlock,
                    styles.busyTapBlock
                  )}
                  style={{ left: at(BUSY_TAP), width: span(TAP) }}>
                  tap
                </span>
              </div>
            </section>
            <section className={clsx(styles.lane, styles.js)}>
              <span className={styles.title}>JS thread</span>
              <div className={styles.track}>
                {[TAP_BEFORE + TAP, TAP_AFTER + TAP].map((time) => (
                  <span
                    key={time}
                    className={clsx(styles.block, styles.handlerBlock)}
                    style={{ left: at(time), width: span(HANDLER) }}>
                    onTap
                  </span>
                ))}
                <span
                  className={clsx(styles.block, styles.handlerBlock)}
                  style={{ left: at(BUSY.to), width: span(HANDLER) }}>
                  onTap ×{TAPS_QUEUED.length}
                </span>
                <span
                  className={clsx(styles.block, styles.busyBlock)}
                  style={{
                    left: at(BUSY.from),
                    width: span(BUSY.to - BUSY.from),
                  }}>
                  busyTask
                </span>
              </div>
            </section>
            <span className={styles.playhead} aria-hidden="true" />
          </div>
        </div>
        <RecordingPhone
          videoRef={videoRef}
          src="/recordings/busy-js-thread.mp4"
          label="Recording: a button that reacts late while the JS thread is busy"
        />
      </div>
    </figure>
  );
}
