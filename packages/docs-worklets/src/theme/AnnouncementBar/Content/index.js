import React from 'react';
import clsx from 'clsx';
import ArrowButton from './ArrowButton';
import styles from './styles.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';
import AnnouncementBarCloseButton from '@theme/AnnouncementBar/CloseButton';

export default function AnnouncementBarContent(props) {
  const { isCloseable, close } = props;
  return (
    <div className={clsx(styles.content, props.className)}>
      <img
        className={styles.logo}
        src={useBaseUrl('/img/appjs-2025-logo.svg')}
        alt="App.js Conf 2025 logo"
      />
      <p className={styles.headline}>
        Join us on the biggest React Native & Expo-focused conference.
      </p>
      <a className={styles.link} href="https://appjs.co/" target="_blank">
        <span className={styles.linkTitle}>Learn more</span>
        <div className={styles.linkArrowContainer}>
          <ArrowButton className={styles.linkArrow} />
        </div>
      </a>
      {isCloseable && (
        <AnnouncementBarCloseButton onClick={close} className={styles.close} />
      )}
    </div>
  );
}
