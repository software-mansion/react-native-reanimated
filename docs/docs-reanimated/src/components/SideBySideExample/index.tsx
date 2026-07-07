import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import CollapsibleCode from '@site/src/components/CollapsibleCode';
import ReducedMotionWarning from '@site/src/components/ReducedMotionWarning';
import clsx from 'clsx';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import styles from './styles.module.css';

type BaseProps = {
  /** Raw source of the example, shown in the collapsible code block. */
  src: string;
  /** Lines initially shown in the code block (0-indexed, inclusive). */
  showLines: number[];
};

type PreviewProps = {
  component: React.FC;
  video?: never;
};

type VideoProps = {
  component?: never;
  video: { light: string; dark: string };
};

type Props = BaseProps & (PreviewProps | VideoProps);

export default function SideBySideExample({
  src,
  showLines,
  component,
  video,
}: Props) {
  const Component = component;
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={styles.row}>
      <div className={styles.preview}>
        {video ? (
          <div className={styles.videoCard}>
            <video
              className={clsx(styles.video, styles.videoLight)}
              autoPlay
              loop
              muted
              playsInline>
              <source src={useBaseUrl(video.light)} type="video/mp4" />
            </video>
            <video
              className={clsx(styles.video, styles.videoDark)}
              autoPlay
              loop
              muted
              playsInline>
              <source src={useBaseUrl(video.dark)} type="video/mp4" />
            </video>
          </div>
        ) : (
          <div className={styles.liveCard}>
            <BrowserOnly
              fallback={<div className={styles.loading}>Loading...</div>}>
              {() => (
                <>
                  {prefersReducedMotion && <ReducedMotionWarning />}
                  {Component ? <Component /> : null}
                </>
              )}
            </BrowserOnly>
          </div>
        )}
      </div>
      <div className={styles.code}>
        <CollapsibleCode src={src} showLines={showLines} />
      </div>
    </div>
  );
}
