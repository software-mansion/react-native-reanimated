import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { DocSidebar } from '@swmansion/t-rex-ui';

export default function DocSidebarWrapper(props) {
  const titleImages = {
    light: useBaseUrl('/img/title.svg'),
    dark: useBaseUrl('/img/title-dark.svg'),
  };

  const heroImages = {
    logo: useBaseUrl('/img/logo-hero.svg'),
    title: useBaseUrl('/img/title-hero.svg'),
  };

  const newItems = ['animations/withClamp'];
  const experimentalItems = ['shared-element-transitions/overview'];
  const unreleasedItems = [];

  return (
    <DocSidebar
      newItems={newItems}
      experimentalItems={experimentalItems}
      unreleasedItems={unreleasedItems}
      heroImages={heroImages}
      titleImages={titleImages}
      {...props}
    />
  );
}
