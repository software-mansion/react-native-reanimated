import React, { useEffect, useState } from 'react';

import styles from './styles.module.css';
import clsx from 'clsx';

const BeforeAndAfter = ({ before, after }) => {
  const [currentWidth, setCurrentWidth] = useState(null);

  useEffect(() => {
    function handleResize() {
      const { innerWidth } = window;
      setCurrentWidth(innerWidth);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={clsx(styles.container)}>
      <img src={before} className={clsx(styles.gifs)} />
      {currentWidth && currentWidth >= 650 && (
        <div className={clsx(styles.rightArrow)}>&rarr;</div>
      )}
      {currentWidth && currentWidth < 650 && (
        <div className={clsx(styles.downArrow)}>&darr;</div>
      )}
      <img src={after} className={clsx(styles.gifs)} />
    </div>
  );
};

export default BeforeAndAfter;
