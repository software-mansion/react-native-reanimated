import React from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';

import PhoneFrame from '@site/src/components/PhoneFrame';
import styles from './styles.module.css';

interface RecordingPhoneProps {
  src: string;
  label: string;
  className?: string;
  videoRef?: React.Ref<HTMLVideoElement>;
}

export default function RecordingPhone({
  src,
  label,
  className,
  videoRef,
}: RecordingPhoneProps) {
  const url = useBaseUrl(src);
  return (
    <PhoneFrame
      className={clsx(styles.phone, className)}
      screenClassName={styles.screen}
      hardware={false}
      aria-label={label}>
      <video
        ref={videoRef}
        className={styles.video}
        src={url}
        autoPlay
        loop
        muted
        playsInline
      />
    </PhoneFrame>
  );
}
