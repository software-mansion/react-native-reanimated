import React from 'react';
import Mobile from '@theme-original/DocItem/TOC/Mobile';
import styles from './styles.module.css';

export default function TOCMobileWrapper(props) {
  return (
    <>
      <div className={styles.toc_mobile__wrapper}>
        <Mobile {...props} />
      </div>
    </>
  );
}
