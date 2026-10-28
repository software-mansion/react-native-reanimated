import React, { useEffect, useMemo, useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useDocsVersion } from '@docusaurus/plugin-content-docs/client';
import { DocSidebar } from '@swmansion/t-rex-ui';

const SECTIONS = [
  { id: 'guides', label: 'Learn' },
  { id: 'api', label: 'API Reference' },
];

function sectionOf(sidebar, docsSidebars) {
  const match = Object.entries(docsSidebars).find(
    ([, items]) => items === sidebar || sameItems(items, sidebar)
  );
  return match?.[0] === 'api' ? 'api' : 'guides';
}

function sameItems(a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((item, index) => item.label === b[index]?.label)
  );
}

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
  const experimentalItems = [];
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

  const { docsSidebars } = useDocsVersion();
  const hasSections =
    'gettingStarted' in docsSidebars &&
    SECTIONS.every(({ id }) => id in docsSidebars);
  const docSection = sectionOf(props.sidebar, docsSidebars);
  const [section, setSection] = useState(docSection);

  useEffect(() => {
    setSection(docSection);
  }, [docSection, props.path]);

  useEffect(() => {
    const onClick = (event) => {
      const button = event.target.closest('[data-sidebar-section]');
      if (button !== null) {
        event.preventDefault();
        setSection(button.dataset.sidebarSection);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const sidebar = useMemo(() => {
    if (!hasSections) {
      return props.sidebar;
    }
    const gettingStarted = {
      type: 'category',
      label: 'Getting started',
      collapsible: false,
      collapsed: false,
      items: docsSidebars.gettingStarted,
    };
    const items =
      section === 'guides'
        ? [gettingStarted, ...docsSidebars.guides]
        : docsSidebars.api;

    return [
      {
        type: 'html',
        className: 'sidebar-sections',
        value: `<div role="group" aria-label="Documentation section">${SECTIONS.map(
          ({ id, label }) =>
            `<button type="button" data-sidebar-section="${id}" aria-pressed="${section === id}">${label}</button>`
        ).join('')}</div>`,
      },
      ...items.map((item) =>
        item.type === 'category'
          ? { ...item, collapsible: false, collapsed: false }
          : item
      ),
    ];
  }, [hasSections, props.sidebar, docsSidebars, section]);

  return (
    <DocSidebar
      newItems={newItems}
      experimentalItems={experimentalItems}
      unreleasedItems={unreleasedItems}
      deprecatedItems={deprecatedItems}
      heroImages={heroImages}
      titleImages={titleImages}
      {...props}
      sidebar={sidebar}
    />
  );
}
