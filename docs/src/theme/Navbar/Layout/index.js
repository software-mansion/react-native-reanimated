import React, { useEffect } from 'react';
import clsx from 'clsx';
import { useThemeConfig } from '@docusaurus/theme-common';
import {
  useAnnouncementBar,
  useHideableNavbar,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import { translate } from '@docusaurus/Translate';
import NavbarMobileSidebar from '@theme/Navbar/MobileSidebar';
import styles from './styles.module.css';
import Clouds from '@site/src/components/Hero/Clouds';
import Stars from '@site/src/components/Hero/Stars';
import Sun from '@site/src/components/Hero/Sun';
import Swirl from '@site/src/components/Hero/Swirl';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import usePageType from '@site/src/hooks/usePageType';

function NavbarBackdrop(props) {
  return (
    <div
      role="presentation"
      {...props}
      className={clsx('navbar-sidebar__backdrop', props.className)}
    />
  );
}

const LandingBackground = ({ isAnnouncementBarActive = false }) => {
  return (
    <div
      className={styles.heroBackground}
      data-announcement-bar={isAnnouncementBarActive}>
      <Clouds />
      <Stars />

      {
        /* Swirl uses viewport behind the hood to calculate appropriate width.
         * Thus, access to the viewport is required to render the Swirl component.
         */
        ExecutionEnvironment.canUseViewport && (
          <>
            <Sun />
            <Swirl />
          </>
        )
      }
    </div>
  );
};

export default function NavbarLayout({ children }) {
  const {
    navbar: { hideOnScroll, style },
  } = useThemeConfig();
  const { isActive: announcementBarActive } = useAnnouncementBar();
  const mobileSidebar = useNavbarMobileSidebar();
  const { navbarRef, isNavbarVisible } = useHideableNavbar(hideOnScroll);
  const { isLanding } = usePageType();

  return (
    <div>
      {isLanding && (
        <LandingBackground isAnnouncementBarActive={announcementBarActive} />
      )}
      <nav
        ref={navbarRef}
        aria-label={translate({
          id: 'theme.NavBar.navAriaLabel',
          message: 'Main',
          description: 'The ARIA label for the main navigation',
        })}
        className={clsx(
          'navbar',
          !isLanding && 'navbar--fixed-top',
          isLanding && styles.navbarLanding,
          hideOnScroll && [
            styles.navbarHideable,
            !isNavbarVisible && styles.navbarHidden,
          ],
          {
            'navbar--dark': style === 'dark',
            'navbar--primary': style === 'primary',
            'navbar-sidebar--show': mobileSidebar.shown,
          }
        )}>
        {children}
        <NavbarBackdrop onClick={mobileSidebar.toggle} />
        <NavbarMobileSidebar />
      </nav>
    </div>
  );
}
