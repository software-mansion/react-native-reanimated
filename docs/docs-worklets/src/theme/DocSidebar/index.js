import React, { useEffect, useMemo, useRef, useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useDocsVersion } from '@docusaurus/plugin-content-docs/client';
import { DocSidebar } from '@swmansion/t-rex-ui';
import {
  SIMULATION_CLOSE_EVENT,
  SIMULATION_OPEN_EVENT,
} from '@site/src/components/ThreadingSimulation/events';

const SECTIONS = [
  { id: 'guides', label: 'Learn' },
  { id: 'api', label: 'API Reference' },
];

function sectionOf(sidebar, docsSidebars) {
  const match = Object.entries(docsSidebars).find(
    ([, items]) => items === sidebar || sameItems(items, sidebar)
  );
  return match === undefined ? 'guides' : match[0];
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

  const docsRoot = useBaseUrl('/docs/');
  const { docsSidebars } = useDocsVersion();
  const hasSections = 'guides' in docsSidebars && 'api' in docsSidebars;
  const onStartPage =
    (props.path ?? '').replace(/\/$/, '') === docsRoot.replace(/\/$/, '');
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

  const wideSimulations = useRef(new Set());
  const hiddenForSimulations = useRef(false);

  useEffect(() => {
    const isWide = () => {
      const container = document.querySelector('.theme-doc-sidebar-container');
      return (
        container !== null && container.getBoundingClientRect().width > 100
      );
    };
    const toggle = () => {
      if (typeof props.onCollapse === 'function') {
        props.onCollapse();
      }
    };
    const onSimulationOpen = (event) => {
      wideSimulations.current.add(event.detail);
      if (isWide()) {
        hiddenForSimulations.current = true;
        toggle();
      }
    };
    const onSimulationClose = (event) => {
      wideSimulations.current.delete(event.detail);
      if (
        hiddenForSimulations.current &&
        wideSimulations.current.size === 0 &&
        !isWide()
      ) {
        hiddenForSimulations.current = false;
        toggle();
      }
    };
    const onManualToggle = (event) => {
      if (
        event.target.closest(
          '[class*="collapseSidebarButton"], [class*="expandButton"]'
        ) !== null
      ) {
        hiddenForSimulations.current = false;
        wideSimulations.current.clear();
      }
    };
    window.addEventListener(SIMULATION_OPEN_EVENT, onSimulationOpen);
    window.addEventListener(SIMULATION_CLOSE_EVENT, onSimulationClose);
    document.addEventListener('click', onManualToggle, true);
    return () => {
      window.removeEventListener(SIMULATION_OPEN_EVENT, onSimulationOpen);
      window.removeEventListener(SIMULATION_CLOSE_EVENT, onSimulationClose);
      document.removeEventListener('click', onManualToggle, true);
    };
  }, [props.onCollapse]);

  const sidebar = useMemo(() => {
    if (!hasSections) {
      return props.sidebar;
    }
    const entries = [
      {
        type: 'link',
        label: 'Getting started',
        href: docsRoot,
        className: onStartPage
          ? 'sidebar-section sidebar-section--active'
          : 'sidebar-section',
      },
      ...SECTIONS.map(({ id, label }) => ({
        type: 'html',
        value: `<button type="button" class="sidebar-section-button" data-sidebar-section="${id}">${label}</button>`,
        className:
          section === id
            ? 'sidebar-section sidebar-section--active'
            : 'sidebar-section',
      })),
      { type: 'html', value: '<hr />', className: 'sidebar-section-divider' },
    ];
    return [...entries, ...docsSidebars[section]];
  }, [
    hasSections,
    props.sidebar,
    docsSidebars,
    section,
    onStartPage,
    docsRoot,
  ]);

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
