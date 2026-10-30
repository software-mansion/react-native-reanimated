import React from 'react';
import styles from './styles.module.css';

// CSS-only stand-ins for the demos a browser cannot drive: there is no
// gyroscope or software keyboard on a desktop, so the phone plays them back.

export function SensorDemo() {
  return (
    <div className={styles.sensor} aria-hidden="true">
      <div className={styles.level}>
        <span className={styles.bubble} />
      </div>
      <div className={styles.floor}>
        <span className={styles.ball} />
      </div>
    </div>
  );
}

const KEY_ROWS = [10, 9, 7];

export function KeyboardDemo() {
  return (
    <div className={styles.chat} aria-hidden="true">
      <div className={styles.messages}>
        <span className={styles.messageIn} />
        <span className={styles.messageIn} data-short />
        <span className={styles.messageOut} />
      </div>
      <div className={styles.composer}>
        <div className={styles.inputRow}>
          <span className={styles.input}>
            <span className={styles.caret} />
          </span>
          <span className={styles.send} />
        </div>
        <div className={styles.keyboard}>
          {KEY_ROWS.map((count, row) => (
            <div key={row} className={styles.keyRow}>
              {Array.from({ length: count }, (_, idx) => (
                <span key={idx} className={styles.key} />
              ))}
            </div>
          ))}
          <div className={styles.keyRow}>
            <span className={styles.key} data-wide />
            <span className={styles.key} data-space />
            <span className={styles.key} data-wide />
          </div>
        </div>
      </div>
    </div>
  );
}
