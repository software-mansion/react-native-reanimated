import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';

import usePageType from '@site/src/hooks/usePageType';

const BRAND_LINK = 'https://swmansion.com/';

export default function FooterCopyright({ copyright }) {
  const { isDocumentation } = usePageType();

  const brandLogo = {
    light: useBaseUrl('/img/brand.svg'),
    dark: useBaseUrl('/img/brand-dark.svg'),
  };

  return (
    <div className={clsx('footer__copyright', styles.footer)}>
      {
        <a href={BRAND_LINK} target="_blank">
          <div className={styles.footer__logo}>
            <ThemedImage sources={brandLogo} />
          </div>
        </a>
      }
      <p className={clsx(!isDocumentation && styles.landing)}>
        <span className={styles.footer__brand}>
          &copy;{' '}
          <a href={BRAND_LINK} target="_blank">
            Software Mansion
          </a>
          {' ' + new Date().getFullYear()}.
        </span>
        {` ${copyright}`}
      </p>
    </div>
  );
}
