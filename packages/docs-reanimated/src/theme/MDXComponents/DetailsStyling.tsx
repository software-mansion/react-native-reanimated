import { useCollapsible, Collapsible } from '@docusaurus/theme-common';

import clsx from 'clsx';
import React from 'react';
import { useRef, useState } from 'react';

import styles from './styles.module.css';
import useIsBrowser from '@docusaurus/useIsBrowser';
import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';

const DetailsStyling = ({ summary, children, ...props }): JSX.Element => {
  const isBrowser = useIsBrowser();
  const { collapsed, setCollapsed } = useCollapsible({
    initialState: !props.open,
  });

  const arrowIcon = {
    light: useBaseUrl('/img/Arrow.svg'),
    dark: useBaseUrl('img/Arrow-dark.svg'),
  };

  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(props.open);

  // As we need to modify our own summary, we need to extract original content of summary
  const extractedSummaryElement = summary.props.children;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <details
      {...props}
      ref={detailsRef}
      open={open}
      data-collapsed={collapsed}
      className={clsx(
        styles.details,
        isBrowser && styles.isBrowser,
        props.className
      )}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        // Prevent a double-click to highlight summary text
        if (isInSummary(target) && e.detail > 1) {
          e.preventDefault();
        }
      }}
      onClick={(e) => {
        e.stopPropagation(); // For isolation of multiple nested details/summary
        const target = e.target as HTMLElement;
        const shouldToggle =
          isInSummary(target) && hasParent(target, detailsRef.current!);
        if (!shouldToggle) {
          return;
        }
        e.preventDefault();
        if (collapsed) {
          setCollapsed(false);
          setOpen(true);
        } else {
          setCollapsed(true);
          // Don't do this, it breaks close animation!
          // setOpen(false);
        }
      }}>
      <summary>
        <ThemedImage sources={arrowIcon} className={styles.arrow} />

        <p>{extractedSummaryElement}</p>
      </summary>

      <Collapsible
        lazy={false}
        collapsed={collapsed}
        disableSSRStyle
        onCollapseTransitionEnd={(newCollapsed) => {
          setCollapsed(newCollapsed);
          setOpen(!newCollapsed);
        }}>
        <div className={styles.collapsibleContent}>{children}</div>
      </Collapsible>
    </details>
  );
};

function isInSummary(node: HTMLElement | null): boolean {
  if (!node) {
    return false;
  }
  return node.tagName === 'SUMMARY' || isInSummary(node.parentElement);
}

function hasParent(node: HTMLElement | null, parent: HTMLElement): boolean {
  if (!node) {
    return false;
  }
  return node === parent || hasParent(node.parentElement, parent);
}

export default DetailsStyling;
