import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { DocSidebar } from '@swmansion/t-rex-ui';

export default function DocSidebarWrapper(props) {
  const titleImages = {
    light: useBaseUrl('/img/title.svg'),
    dark: useBaseUrl('/img/title-dark.svg'),
  };

  const heroImages = {
    logo: useBaseUrl('/img/logo.svg'),
    title: useBaseUrl('/img/title.svg'),
  };

  const newItems = [];
  const experimentalItems = [
    'bundleMode/overview',
    'bundleMode/setup',
    'bundleMode/usage',
  ];
  const unreleasedItems = [];
  const deprecatedItems = [
    'threading/callMicrotasks',
    'threading/executeOnUIRuntimeSync',
    'threading/runOnJS',
    'threading/runOnRuntime',
    'threading/runOnUI',
    'memory/makeShareable',
    'memory/makeShareableCloneRecursive',
    'memory/makeShareableCloneOnUIRecursive',
  ];

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
