import React from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';

interface PhoneFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  overlay?: React.ReactNode;
  screenClassName?: string;
  hardware?: boolean;
  children: React.ReactNode;
}

export default function PhoneFrame({
  overlay,
  screenClassName,
  hardware = true,
  className,
  children,
  ...rest
}: PhoneFrameProps) {
  return (
    <div className={clsx(styles.frame, className)} {...rest}>
      {overlay}
      {hardware && <span className={styles.camera} aria-hidden="true" />}
      <div className={clsx(styles.screen, screenClassName)}>{children}</div>
      {hardware && (
        <span className={styles.speaker} aria-label="Speaker">
          <span />
          <span />
          <span />
        </span>
      )}
    </div>
  );
}
