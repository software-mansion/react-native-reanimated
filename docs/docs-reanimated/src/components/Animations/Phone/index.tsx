import React from 'react';
import clsx from 'clsx';
import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './styles.module.css';

export type PhoneMotion = 'tilt';

interface Props {
  title: string;
  hint?: string;
  motion?: PhoneMotion;
  screenKey: string;
  render: () => React.ReactNode;
  compact?: boolean;
  pager?: {
    labels: string[];
    active: number;
    onSelect: (index: number) => void;
  };
}

export default function Phone({
  title,
  hint,
  motion,
  screenKey,
  render,
  compact = false,
  pager,
}: Props) {
  return (
    <figure
      className={clsx(styles.phoneWrap, compact && styles.compact)}
      aria-label={`Live demo: ${title}`}>
      <div className={clsx(styles.phone, motion === 'tilt' && styles.tilt)}>
        <div className={styles.screen}>
          <div className={styles.statusBar} aria-hidden="true">
            <span className={styles.clock}>9:41</span>
            <span className={styles.island} />
            <StatusIcons />
          </div>
          <div key={screenKey} className={styles.app}>
            <p className={styles.appTitle}>{title}</p>
            <div className={styles.demo}>
              <BrowserOnly fallback={<span className={styles.loading} />}>
                {render}
              </BrowserOnly>
            </div>
            {hint && <p className={styles.hint}>{hint}</p>}
          </div>
          <span className={styles.homeIndicator} aria-hidden="true" />
        </div>
      </div>
      {pager && (
        <nav className={styles.pager} aria-label="Examples">
          {pager.labels.map((label, idx) => (
            <button
              key={label}
              type="button"
              className={clsx(
                styles.pagerDot,
                idx === pager.active && styles.pagerDotActive
              )}
              aria-label={label}
              aria-current={idx === pager.active}
              onClick={() => pager.onSelect(idx)}
            />
          ))}
        </nav>
      )}
    </figure>
  );
}

function StatusIcons() {
  return (
    <svg
      className={styles.statusIcons}
      width="46"
      height="12"
      viewBox="0 0 46 12"
      fill="currentColor">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0.5" width="3" height="11.5" rx="1" />
      <rect
        x="23.5"
        y="1"
        width="19"
        height="10"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
      />
      <rect x="25.5" y="3" width="13" height="6" rx="1.5" />
      <rect x="43.5" y="4" width="1.5" height="4" rx="0.75" opacity="0.45" />
    </svg>
  );
}
