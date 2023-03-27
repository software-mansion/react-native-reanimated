import React from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import { useAnnouncementBar } from '@docusaurus/theme-common/internal';
import AnnouncementBarCloseButton from '@theme/AnnouncementBar/CloseButton';
import AnnouncementBarContent from '@theme/AnnouncementBar/Content';
import styles from './styles.module.css';
import Particles from './particles.svg';

export default function AnnouncementBar() {
  const { announcementBar } = useThemeConfig();
  const { isActive, close } = useAnnouncementBar();
  if (!isActive) {
    return null;
  }
  const { backgroundColor, textColor, isCloseable } = announcementBar;

  // hide announcement bar after app.js
  const today = new Date();
  const endOfAppJS = new Date('2023-05-13T00:00:00.000Z');
  if (today > endOfAppJS) {
    return null;
  }

  return (
    <div
      className={styles.announcementBar}
      style={{
        backgroundColor,
        color: textColor,
      }}
      role="banner">
      <Particles
        className={`${styles.announcementBarAdornment} ${styles.announcementBarLeftAdornment}`}
      />
      {isCloseable && <div className={styles.announcementBarPlaceholder} />}
      <AnnouncementBarContent className={styles.announcementBarContent} />
      {isCloseable && (
        <AnnouncementBarCloseButton
          onClick={close}
          className={styles.announcementBarClose}
        />
      )}
      <Particles
        className={`${styles.announcementBarAdornment} ${styles.announcementBarRightAdornment}`}
      />
    </div>
  );
}
