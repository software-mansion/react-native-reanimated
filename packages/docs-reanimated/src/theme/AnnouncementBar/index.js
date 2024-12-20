import React, { useEffect, useState } from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import { useAnnouncementBar } from '@docusaurus/theme-common/internal';
import AnnouncementBarContent from '@theme/AnnouncementBar/Content';
import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './styles.module.css';

function AnnouncementBar() {
  const { announcementBar } = useThemeConfig();
  const { isActive, close } = useAnnouncementBar();
  const [isPageLoaded, setIsPageLoaded] = useState(
    document.readyState === 'complete'
  );

  useEffect(() => {
    const handlePageLoad = () => {
      setIsPageLoaded(true);
    };

    if (document.readyState === 'complete') {
      setIsPageLoaded(true);
    } else {
      window.addEventListener('load', handlePageLoad);
    }

    return () => {
      window.removeEventListener('load', handlePageLoad);
    };
  }, []);

  if (!isPageLoaded || !isActive) {
    return null;
  }

  // hide announcement bar at the end of the State of React Native survey
  const today = new Date();
  const endOfStateOfReactNative = new Date('2025-01-08T00:00:00.000Z');
  if (today > endOfStateOfReactNative) {
    return null;
  }

  const { backgroundColor, textColor, isCloseable } = announcementBar;
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div
          className={styles.announcementBar}
          style={{ backgroundColor, color: textColor }}
          role="banner">
          <AnnouncementBarContent
            className={styles.announcementBarContent}
            isCloseable={isCloseable}
            close={close}
          />
        </div>
      )}
    </BrowserOnly>
  );
}

export default function HOCAnnouncementBar() {
  return (
    <BrowserOnly fallback={<div></div>}>
      {() => <AnnouncementBar />}
    </BrowserOnly>
  );
}
