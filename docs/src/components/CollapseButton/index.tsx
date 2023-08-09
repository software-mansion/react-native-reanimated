import React from 'react';
import styles from './styles.module.css';
import Arrow from '@site/static/img/Arrow.svg';
import ArrowDark from '@site/static/img/Arrow-dark.svg';
import { useColorMode } from '@docusaurus/theme-common';
import clsx from 'clsx';

const CollapseButton: React.FC<{
  label: string;
  labelCollapsed: string;
  collapsed: boolean;
  onCollapse: () => void;
  className?: string;
}> = ({ label, labelCollapsed, collapsed, onCollapse, className }) => {
  const { colorMode } = useColorMode();

  return (
    <div
      className={clsx(styles.collapseButton, className)}
      data-collapsed={collapsed}
      onClick={() => onCollapse()}>
      {colorMode === 'light' ? (
        <Arrow className={styles.arrow} />
      ) : (
        <ArrowDark className={styles.arrow} />
      )}

      <button>{collapsed ? labelCollapsed : label}</button>
    </div>
  );
};

export default CollapseButton;
