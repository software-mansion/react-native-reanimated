import React from 'react';
import {
  useThemeConfig,
  ErrorCauseBoundary,
  useWindowSize,
} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import NavbarItem from '@theme/NavbarItem';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import styles from './styles.module.css';
import clsx from 'clsx';
import usePageType from '@site/src/hooks/usePageType';
import AlgoliaSearchBar from '@site/src/components/AlgoliaSearchBar';

function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

function NavbarItems({ items, isDocumentation = true }) {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              { cause: error }
            )
          }>
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}
function NavbarContentLayout({ left, right }) {
  const { isLanding } = usePageType();

  return (
    <div className="navbar__inner">
      <div className="navbar__items">{left}</div>
      <div
        className={clsx(
          'navbar__items navbar__items--right',
          isLanding && styles.navbarItemsLanding
        )}>
        {right}
      </div>
    </div>
  );
}

export default function NavbarContent() {
  const windowSize = useWindowSize();
  const isMobile = windowSize === 'mobile';

  const { isDocumentation, isLanding } = usePageType();
  const mobileSidebar = useNavbarMobileSidebar();
  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);
  const searchBarItem = items.find((item) => item.type === 'search');
  return (
    <NavbarContentLayout
      left={
        <>
          <div className={styles.logoWrapper}>
            <NavbarLogo />
          </div>
          <NavbarItems items={leftItems} />
          {!searchBarItem && !isMobile && !isLanding && <AlgoliaSearchBar />}
          {!isMobile && isDocumentation && (
            <NavbarColorModeToggle className={styles.colorModeToggle} />
          )}
        </>
      }
      right={
        <>
          {(isLanding || (!isMobile && !isDocumentation)) && (
            <NavbarColorModeToggle className={styles.colorModeToggle} />
          )}
          <NavbarItems items={rightItems} isDocumentation={isDocumentation} />
          {!mobileSidebar.disabled && !isLanding && (
            <NavbarMobileSidebarToggle />
          )}
        </>
      }
    />
  );
}
