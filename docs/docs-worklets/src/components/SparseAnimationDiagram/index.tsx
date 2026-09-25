import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

import RecordingPhone from '@site/src/components/RecordingPhone';
import styles from './styles.module.css';

const DURATION = 9;
const FRAME_MS = 16;
const FRAMES_PER_BAR = 5;
const BUSY = { from: 1.6, to: 4.62 };

const at = (seconds: number) => `${(seconds / DURATION) * 100}%`;
const span = (seconds: number) => `${(seconds / DURATION) * 100}%`;

const BAR_STEP = (FRAME_MS * FRAMES_PER_BAR) / 1000;
const BARS = Array.from(
  { length: Math.floor(DURATION / BAR_STEP) },
  (_, index) => Math.round((index + 0.5) * BAR_STEP * 1000) / 1000
);
const JS_BARS = BARS.filter((time) => time < BUSY.from || time > BUSY.to);

export default function SparseAnimationDiagram() {
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
      aria-label="A state-driven animation freezing while the JS thread is busy">
      <div className={styles.layout}>
        <div className={styles.scene}>
          <div className={styles.lanes} ref={lanesRef}>
            <section className={clsx(styles.lane, styles.js)}>
              <span className={styles.title}>JS thread</span>
              <div className={styles.track}>
                {JS_BARS.map((time) => (
                  <span
                    key={time}
                    className={clsx(styles.bar, styles.jsBar)}
                    style={{ left: at(time) }}
                  />
                ))}
                <span
                  className={styles.longFrame}
                  style={{
                    left: at(BUSY.from),
                    width: span(BUSY.to - BUSY.from),
                  }}>
                  busyTask
                </span>
              </div>
            </section>
            <section className={clsx(styles.lane, styles.ui)}>
              <span className={styles.title}>UI thread</span>
              <div className={styles.track}>
                {BARS.map((time) => (
                  <span
                    key={time}
                    className={clsx(styles.bar, styles.uiBar)}
                    style={{ left: at(time) }}
                  />
                ))}
              </div>
            </section>
            <span className={styles.playhead} aria-hidden="true" />
          </div>
          <dl className={styles.legend}>
            <div className={styles.legendItem}>
              <dt className={clsx(styles.legendBar, styles.jsSwatch)} />
              <dd>JS frame</dd>
            </div>
            <div className={styles.legendItem}>
              <dt className={clsx(styles.legendBar, styles.uiSwatch)} />
              <dd>UI frame</dd>
            </div>
          </dl>
        </div>
        <RecordingPhone
          videoRef={videoRef}
          src="/recordings/sparse-state-animation.mp4"
          label="Recording: a square animated with state freezing while the JS thread is busy"
        />
      </div>
    </figure>
  );
}
