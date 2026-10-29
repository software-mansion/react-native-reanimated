import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

import RecordingPhone from '@site/src/components/RecordingPhone';
import styles from './styles.module.css';

export type BlockKind = 'tap' | 'handler' | 'busy' | 'ui' | 'worker';

export interface TimelineBlock {
  from: number;
  to: number;
  label: string;
  kind: BlockKind;
  row?: number;
}

export interface TimelineLane {
  title: string;
  tag?: string;
  accent: 'ui' | 'js' | 'worker';
  rows?: number;
  blocks: TimelineBlock[];
}

interface LaneTimelineProps {
  label: string;
  duration: number;
  lanes: TimelineLane[];
  legend?: { kind: BlockKind; label: string }[];
  recording?: { src: string; label: string };
}

const ROW_HEIGHT = 46;

export default function LaneTimeline({
  label,
  duration,
  lanes,
  legend,
  recording,
}: LaneTimelineProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lanesRef = useRef<HTMLDivElement | null>(null);
  const at = (seconds: number) => `${(seconds / duration) * 100}%`;

  useEffect(() => {
    const video = videoRef.current;
    const element = lanesRef.current;
    if (video === null || element === null) {
      return;
    }
    let frame = 0;
    const follow = () => {
      const total =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : duration;
      element.style.setProperty(
        '--playhead',
        String(video.currentTime / total)
      );
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [duration]);

  return (
    <figure className={styles.figure} aria-label={label}>
      <div className={styles.layout}>
        <div className={styles.scene}>
          <div className={styles.lanes} ref={lanesRef}>
            {lanes.map((lane) => (
              <section
                key={lane.title}
                className={clsx(styles.lane, styles[lane.accent])}>
                <span className={styles.title}>{lane.title}</span>
                {lane.tag !== undefined && (
                  <span className={styles.tag}>{lane.tag}</span>
                )}
                <div
                  className={styles.track}
                  style={{ height: ROW_HEIGHT * (lane.rows ?? 1) }}>
                  {Array.from({ length: lane.rows ?? 1 }, (_, row) => (
                    <span
                      key={row}
                      className={styles.rail}
                      style={{ top: ROW_HEIGHT * row + ROW_HEIGHT / 2 }}
                    />
                  ))}
                  {lane.blocks.map((block, index) => (
                    <span
                      key={index}
                      className={clsx(styles.block, styles[block.kind])}
                      style={{
                        left: at(block.from),
                        width: at(block.to - block.from),
                        top: ROW_HEIGHT * (block.row ?? 0) + ROW_HEIGHT / 2,
                      }}>
                      {block.label}
                    </span>
                  ))}
                </div>
              </section>
            ))}
            {recording !== undefined && (
              <span className={styles.playhead} aria-hidden="true" />
            )}
          </div>
          {legend !== undefined && (
            <dl className={styles.legend}>
              {legend.map((item) => (
                <div key={item.kind} className={styles.legendItem}>
                  <dt className={clsx(styles.swatch, styles[item.kind])} />
                  <dd>{item.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {recording !== undefined && (
          <RecordingPhone
            videoRef={videoRef}
            src={recording.src}
            label={recording.label}
          />
        )}
      </div>
    </figure>
  );
}
