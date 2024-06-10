import React from 'react';
import { useThemeConfig } from '@docusaurus/theme-common';
import { useNavbarMobileSidebar } from '@docusaurus/theme-common/internal';
import NavbarItem from '@theme/NavbarItem';

function useNavbarItems() {
  // TODO temporary casting until ThemeConfig type is improved
  return useThemeConfig().navbar.items;
}

const ignoredClassNames = ['header-github'];

// Filter items on mobile sidebar (such as GitHub icon) that contains specified className
function filterIgnoredItems(items) {
  return items.filter((item) =>
    item.className ? !ignoredClassNames.includes(item.className) : item
  );
}

// The primary menu displays the navbar items
export default function NavbarMobilePrimaryMenu() {
  const mobileSidebar = useNavbarMobileSidebar();

  // TODO how can the order be defined for mobile?
  // Should we allow providing a different list of items?
  const items = useNavbarItems();
  const filteredItems = filterIgnoredItems(items);

  return (
    <ul className="menu__list">
      {filteredItems.map((item, i) => (
        <NavbarItem
          mobile
          {...item}
          onClick={() => mobileSidebar.toggle()}
          key={i}
        />
      ))}
    </ul>
  );
}
