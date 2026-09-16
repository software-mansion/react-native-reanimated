import React from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';

export default function ThreadingDiagram() {
  return (
    <figure className={styles.figure} aria-label="React Native threading model">
      <div className={styles.scene}>
        <section className={clsx(styles.panel, styles.js)}>
          <span className={styles.title}>JS thread</span>
          <div className={styles.box}>
            <span className={styles.boxTitle}>RN Runtime</span>
            <span className={styles.boxDetail}>your JavaScript</span>
            <code className={styles.code}>
              {'<View>\n  <Text>{count}</Text>\n</View>'}
            </code>
          </div>
          <span className={styles.note}>
            runs components and handlers, then prepares UI updates
          </span>
        </section>

        <div
          className={clsx(styles.arrow, styles.arrowJs)}
          aria-hidden="true"
        />

        <section className={clsx(styles.panel, styles.layer)}>
          <span className={styles.title}>Common layer</span>
          <div className={styles.queue}>
            <span className={styles.queueTitle}>UI updates</span>
            <span className={styles.update}>create &lt;Text&gt;</span>
            <span className={styles.update}>set text "1"</span>
            <span className={styles.update}>layout &lt;View&gt;</span>
          </div>
          <span className={styles.note}>
            native structures both threads can access
          </span>
        </section>

        <div
          className={clsx(styles.arrow, styles.arrowUi)}
          aria-hidden="true"
        />

        <section className={clsx(styles.panel, styles.ui)}>
          <span className={styles.title}>UI thread</span>
          <div className={styles.box}>
            <span className={styles.boxTitle}>Native UI</span>
            <span className={styles.boxDetail}>consumes the updates</span>
          </div>
          <div className={styles.phone} aria-hidden="true">
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              <span className={styles.phoneText}>1</span>
              <span className={styles.phoneButton}>Increment</span>
            </div>
          </div>
          <span className={styles.note}>draws the views on screen</span>
        </section>
      </div>
    </figure>
  );
}
