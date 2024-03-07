import React from 'react';
import clsx from 'clsx';
import ArrowButton from './ArrowButton';
import styles from './styles.module.css';

export default function AnnouncementBarContent(props) {
  return (
    <div className={clsx(styles.content, props.className)}>
      <div className={styles.wrapper}>
        <strong className={styles.headline}>App.js Conf 2024</strong>
        <p className={styles.subText}>
          An Expo & React Native conference in Europe is back, May 22-24 in
          Kraków, Poland!
        </p>
      </div>
      <a
        className={styles.link}
        href="https://appjs.co/"
        target="_blank"
        rel="noreferrer noopener">
        <span className={styles.linkTitle}>Learn More</span>
        <div className={styles.linkArrowContainer}>
          <ArrowButton className={styles.linkArrow} />
        </div>
      </a>
    </div>
  );
}
