import React from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import { useAnnouncementBar } from '@docusaurus/theme-common/internal';
import AnnouncementBarCloseButton from '@theme/AnnouncementBar/CloseButton';
import AnnouncementBarContent from '@theme/AnnouncementBar/Content';
import styles from './styles.module.css';

const particles = 'img/particles.svg';

export default function AnnouncementBar() {
  const { announcementBar } = useThemeConfig();
  const { isActive, close } = useAnnouncementBar();
  if (!isActive) {
    return null;
  }
  const { backgroundColor, textColor, isCloseable } = announcementBar;

  return (
    <div
      className={styles.announcementBar}
      style={{
        backgroundColor,
        color: textColor,
      }}
      role="banner">
      <img
        src={particles}
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
      <img
        src={particles}
        className={`${styles.announcementBarAdornment} ${styles.announcementBarRightAdornment}`}
      />
    </div>
  );
}
