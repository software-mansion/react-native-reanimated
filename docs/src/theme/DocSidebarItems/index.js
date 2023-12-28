import React, { memo } from 'react';
import { DocSidebarItemsExpandedStateProvider } from '@docusaurus/theme-common/internal';
import DocSidebarItem from '@theme/DocSidebarItem';
import SidebarLabel from '@site/src/components/SidebarLabel';
import styles from './styles.module.css';

const EXPERIMENTAL_APIs = ['shared-element-transitions/overview'];
const NEW_APIS = ['animations/withClamp'];

// TODO this item should probably not receive the "activePath" props
// TODO this triggers whole sidebar re-renders on navigation
function DocSidebarItems({ items, ...props }) {
  return (
    <DocSidebarItemsExpandedStateProvider>
      {items.map((item, index) => (
        <div className={styles.wrapper} key={`${item.docId}-${index}`}>
          <DocSidebarItem item={item} index={index} {...props} />
          {EXPERIMENTAL_APIs.includes(item.docId) && (
            <SidebarLabel key={item.docId} type="experimental" />
          )}
          {NEW_APIS.includes(item.docId) && (
            <SidebarLabel key={item.docId} type="new" />
          )}
        </div>
      ))}
    </DocSidebarItemsExpandedStateProvider>
  );
}
// Optimize sidebar at each "level"
export default memo(DocSidebarItems);
