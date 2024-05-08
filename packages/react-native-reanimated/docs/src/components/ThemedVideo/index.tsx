import React from 'react';
import styles from './styles.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';
import clsx from 'clsx';

interface Props {
  sources: {
    light: string;
    dark: string;
  };
}

export default function ThemedVideo(props: Props) {
  const { sources } = props;

  return (
    <div className={styles.container}>
      <video
        playsInline
        autoPlay
        muted
        loop
        className={clsx(styles.themedVideo, styles[`themedVideo--dark`])}>
        <source src={useBaseUrl(sources.dark)} />
      </video>
      <video
        playsInline
        autoPlay
        muted
        loop
        className={clsx(styles.themedVideo, styles[`themedVideo--light`])}>
        <source src={useBaseUrl(sources.light)} />
      </video>
    </div>
  );
}
