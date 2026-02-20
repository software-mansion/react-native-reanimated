import React from 'react';
import HandIcon from '@site/src/components/HandIcon';
import styles from './styles.module.css';

export default function NavbarBanner() {
  return (
    <a
      href="https://appjs.co?origin=swmansion_bar"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.banner}
      style={{ backgroundColor: '#C7CEF5' }}>
      <span>
        <strong>App.js Conf 2026</strong>
        <span className={styles.hiddenOnMobile}>
          {' '}
          is just around the corner!
        </span>
      </span>
      <HandIcon aria-hidden="true" className={styles.icon} />
      <span className={styles.underline}>Get your tickets</span>
    </a>
  );
}
