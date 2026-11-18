import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useDocsVersion } from '@docusaurus/plugin-content-docs/client';
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

  const newItems = [];
  const isNextVersion = useDocsVersion().version === 'current';
  const experimentalItems = isNextVersion
    ? []
    : ['shared-element-transitions/overview'];
  const deprecatedItems = ['device/useAnimatedKeyboard'];
  const unreleasedItems = [];

  return (
    <DocSidebar
      newItems={newItems}
      experimentalItems={experimentalItems}
      unreleasedItems={unreleasedItems}
      deprecatedItems={deprecatedItems}
      heroImages={heroImages}
      titleImages={titleImages}
      {...props}
    />
  );
}
