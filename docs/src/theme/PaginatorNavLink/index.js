import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';
import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function PaginatorNavLink(props) {
  const { permalink, title, subLabel, isNext } = props;

  const rightArrow = {
    light: useBaseUrl('/img/arrow-right.svg'),
    dark: useBaseUrl('/img/arrow-right-dark.svg'),
  };

  const leftArrow = {
    light: useBaseUrl('/img/arrow-left.svg'),
    dark: useBaseUrl('/img/arrow-left-dark.svg'),
  };

  return (
    <Link
      className={clsx(
        styles.pagination,
        'pagination-nav__link',
        isNext ? 'pagination-nav__link--next' : 'pagination-nav__link--prev'
      )}
      to={permalink}>
      {subLabel && (
        <div
          className={clsx(
            styles.paginationSublabel,
            isNext ? styles.paginationNext : styles.paginationPrevious
          )}>
          <div className={styles.paginationArrow}>
            <ThemedImage sources={isNext ? rightArrow : leftArrow} />
          </div>
          <div className="pagination-nav__sublabel">{subLabel}</div>
        </div>
      )}
      <div className="pagination-nav__label">{title}</div>
    </Link>
  );
}
