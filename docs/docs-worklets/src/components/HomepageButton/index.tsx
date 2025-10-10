import React from 'react';
import styles from './styles.module.css';

import ArrowRight from '@site/static/img/arrow-right-hero.svg';
import clsx from 'clsx';

export const ButtonStyling = {
  TO_BLUE: styles.buttonTransparentStyling,
  TO_TRANSPARENT: styles.buttonBlueStyling,
};

export const BorderStyling = {
  BLUE: styles.buttonBlueBorderStyling,
};

const HomepageButton: React.FC<{
  title: string;
  href: string;
  target?: '_blank' | '_parent' | '_self' | '_top';
  backgroundStyling?: string;
  borderStyling?: string;
  hideArrow?: boolean;
  className?: string;
}> = ({
  title,
  href,
  target = '_self',
  backgroundStyling = ButtonStyling.TO_TRANSPARENT,
  borderStyling = BorderStyling.BLUE,
  hideArrow = false,
  className,
}) => {
  return (
    <a
      href={href}
      target={target}
      className={clsx(styles.homepageButtonLink, className)}>
      <div
        className={clsx(
          styles.homepageButton,
          backgroundStyling,
          borderStyling
        )}>
        {title}

        {!hideArrow && (
          <div className={styles.arrow}>
            <ArrowRight />
          </div>
        )}
      </div>
    </a>
  );
};

export default HomepageButton;
