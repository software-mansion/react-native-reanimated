import React from 'react';
import { SkipToContentLink } from '@docusaurus/theme-common';
import styles from './styles.module.css';
import clsx from 'clsx';
import usePageType from '@site/src/hooks/usePageType';
export default function SkipToContent() {
  const { isDocumentation } = usePageType();
  return (
    <SkipToContentLink
      className={clsx(styles.skipToContent, !isDocumentation && styles.hidden)}
    />
  );
}
