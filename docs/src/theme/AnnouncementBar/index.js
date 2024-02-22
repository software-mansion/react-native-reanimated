import React from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import { useAnnouncementBar } from '@docusaurus/theme-common/internal';
import AnnouncementBarCloseButton from '@theme/AnnouncementBar/CloseButton';
import AnnouncementBarContent from '@theme/AnnouncementBar/Content';
import styles from './styles.module.css';
export default function AnnouncementBar() {
  const { announcementBar } = useThemeConfig();
  const { isActive, close } = useAnnouncementBar();
  if (!isActive) {
    return null;
  }

  // hide announcement bar after app.js
  const today = new Date();
  const endOfAppJS = new Date('2024-05-25T00:00:00.000Z');
  if (today > endOfAppJS) {
    return null;
  }

  const { backgroundColor, textColor, isCloseable } = announcementBar;
  return (
    <div
      className={styles.announcementBar}
      style={{ backgroundColor, color: textColor }}
      role="banner">
      {isCloseable && <div className={styles.announcementBarPlaceholder} />}
      <AnnouncementBarContent className={styles.announcementBarContent} />
      {isCloseable && (
        <div className={styles.buttonContainer}>
          <AnnouncementBarCloseButton
            onClick={close}
            className={styles.announcementBarClose}
          />
        </div>
      )}
    </div>
  );
}
