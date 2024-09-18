import React from 'react';
import styles from './styles.module.css';

interface Props {
  version?: string;
  big?: any;
}

export default function AvailableFrom({ version, big }: Props) {
  return (
    <>
      {big ? (
        <div className={styles.big}>
          <div className={styles.info}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="14"
              fill="none"
              viewBox="0 0 13 14">
              <path
                stroke="#001a72"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.5 10.327v.006m0-6.666v4.666M12.5 7a6 6 0 11-12 0 6 6 0 0112 0z"></path>
            </svg>
          </div>
          <span>
            Available from Reanimated{' '}
            <span className={styles.version}>v{version}</span>
          </span>
        </div>
      ) : (
        <div className={styles.badge}>Available from v{version}</div>
      )}
    </>
  );
}
