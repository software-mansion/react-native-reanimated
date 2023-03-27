import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function AnnouncementBarContent(props) {
  return (
    <div {...props} className={clsx(styles.content, props.className)}>
      <div className={styles.wrapper}>
        <strong className={styles.headline}>We're organizing app.js</strong>
        <p className={styles.subText}>
          a React Native & Expo-focused conference
        </p>
      </div>
      <a
        className={styles.link}
        href="https://appjs.co/"
        target="_blank"
        rel="noreferrer noopener">
        Learn more
      </a>
    </div>
  );
}
