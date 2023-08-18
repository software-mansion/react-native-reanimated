import React from 'react';
import styles from './styles.module.css';

import ArrowRight from '@site/static/img/arrow-right-hero.svg';
import clsx from 'clsx';

export const ButtonStyling = {
  TO_PURPLE: styles.buttonTransparentStyling,
  TO_WHITE: styles.buttonWhiteStyling,
  TO_TRANSPARENT: styles.buttonPurpleStyling,
};

export const BorderStyling = {
  PURPLE: styles.buttonPurpleBorderStyling,
};

const HomepageButton: React.FC<{
  title: string;
  href: string;
  target?: '_blank' | '_parent' | '_self' | '_top';
  backgroundStyling?: string;
  borderStyling?: string;
  enlarged?: boolean;
}> = ({
  title,
  href,
  target = '_self',
  backgroundStyling = ButtonStyling.TO_TRANSPARENT,
  borderStyling = BorderStyling.PURPLE,
  enlarged = false,
}) => {
  return (
    <a href={href} target={target} className={styles.homepageButtonLink}>
      <div
        className={clsx(
          styles.homepageButton,
          backgroundStyling,
          borderStyling
        )}>
        {title}

        <div className={styles.arrow}>
          <ArrowRight />
        </div>
      </div>
    </a>
  );
};

export default HomepageButton;
