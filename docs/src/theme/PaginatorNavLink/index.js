import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

import ArrowLeft from '@site/static/img/arrow-left.svg';
import ArrowRight from '@site/static/img/arrow-right.svg';

import ArrowLeftDark from '@site/static/img/arrow-left-dark.svg';
import ArrowRightDark from '@site/static/img/arrow-right-dark.svg';
import { useColorMode } from '@docusaurus/theme-common';

const arrows = {
  left: {
    light: <ArrowLeft />,
    dark: <ArrowLeftDark />,
  },

  right: {
    light: <ArrowRight />,
    dark: <ArrowRightDark />,
  },
};

export default function PaginatorNavLink(props) {
  const { permalink, title, subLabel, isNext } = props;
  const { colorMode } = useColorMode();

  const matchDirectedArrow = (isNextPaginator) => {
    return isNextPaginator ? arrows['right'] : arrows['left'];
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
            {matchDirectedArrow(isNext)[colorMode]}
          </div>
          <div className="pagination-nav__sublabel">{subLabel}</div>
        </div>
      )}
      <div className="pagination-nav__label">{title}</div>
    </Link>
  );
}
