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
        src={useBaseUrl('/img/react-native-paradise.svg')}
        alt="React Native Paradise logo"
      />
      <strong className={styles.headline}>React Native Paradise</strong>
      <p className={styles.subText}>
        Join us for one week of workshops hosted by React Native experts!
      </p>
      <a
        className={styles.link}
        href="https://paradise.swmansion.com/"
        target="_blank"
        rel="noreferrer noopener">
        <span className={styles.linkTitle}>Check the details</span>
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
