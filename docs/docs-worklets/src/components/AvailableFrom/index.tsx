import { useColorMode } from '@docusaurus/theme-common';
import clsx from 'clsx';
import React from 'react';

import Danger from '/static/img/danger.svg';
import DangerDark from '/static/img/danger-dark.svg';

import styles from './styles.module.css';

interface Props {
  version?: string;
  isFull?: boolean;
}

export default function AvailableFrom({ version, isFull }: Props) {
  const { colorMode } = useColorMode();
  const isLightMode = colorMode === 'light';
  const badgeThemeStyles = isLightMode ? styles.light : styles.dark;

  const getBadgeContent = () => {
    if (isFull) {
      return (
        <>
          <div className={styles.infoIcon}>
            {isLightMode ? <Danger /> : <DangerDark />}
          </div>
          <span>Available from {version}</span>
        </>
      );
    }

    return <>Available from {version}</>;
  };

  return (
    <div
      className={clsx(
        isFull ? styles.fullBadge : styles.badge,
        badgeThemeStyles
      )}>
      {getBadgeContent()}
    </div>
  );
}
