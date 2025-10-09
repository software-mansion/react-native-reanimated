import React, { useEffect, useRef, useState } from 'react';

import styles from './styles.module.css';
import clsx from 'clsx';

const MARGIN_BOTTOM = 60;
const TutorialStep = ({ children, title }) => {
  const [isActive, setIsActive] = useState(false);
  const componentRef = useRef();
  const handleScroll = () => {
    const height = window.innerHeight;
    const position = window.pageYOffset;
    const minScroll = componentRef.current.offsetTop - height / 3;
    const maxScroll =
      componentRef.current.offsetTop +
      componentRef.current.scrollHeight +
      MARGIN_BOTTOM -
      height / 3;
    if (position > minScroll && position < maxScroll) {
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className={clsx(styles.container)} ref={componentRef}>
      <div className={clsx(styles.description)}>
        <div
          className={clsx(styles.roundedStep)}
          style={isActive ? { borderColor: '#001a72' } : {}}>
          <div className={clsx(styles.stepTitle)}>{title}</div>
          {children[0]}
        </div>
      </div>
      <div
        className={clsx(
          isActive ? styles.code : [styles.code, styles.codeInactive]
        )}>
        {children[1]}
      </div>
    </div>
  );
};

export default TutorialStep;
