import React from 'react';
import clsx from 'clsx';
import ArrowButton from './ArrowButton';
import styles from './styles.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function AnnouncementBarContent(props) {
  return (
    <div className={clsx(styles.content, props.className)}>
      <div className={styles.wrapper}>
        <img
          className={styles.logo}
          src={useBaseUrl('/img/state-of-react-native-logo.svg')}
          alt="State of React Native logo"
        />
        <strong className={styles.headline}>State of React Native 2024</strong>
        <p className={styles.subText}>
          Have a few minutes and want to shape the future of React Native?
        </p>
      </div>
      <a
        className={styles.link}
        href="https://survey.stateofreactnative.com/"
        target="_blank"
        rel="noreferrer noopener">
        <span className={styles.linkTitle}>Fill out the survey now!</span>
        <div className={styles.linkArrowContainer}>
          <ArrowButton className={styles.linkArrow} />
        </div>
      </a>
    </div>
  );
}
