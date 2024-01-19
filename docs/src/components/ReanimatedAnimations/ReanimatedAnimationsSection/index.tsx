import React, { useState, useEffect } from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from './styles.module.css';
import InteractiveExampleComponent from '../../InteractiveExample/InteractiveExampleComponent';
import ArrowRight from '@site/static/img/examples/arrow-right-light.svg';

interface Props {
  title: string;
  body: string;
  docsLink: string;
  component: React.ReactNode;
  mobileComponent: React.ReactNode;
  tabletComponent: React.ReactNode;
  code: string;
  idx: number;
}

export default function ReanimatedAnimationsSection({
  title,
  body,
  docsLink,
  component,
  mobileComponent,
  tabletComponent,
  code,
  idx,
}: Props) {
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 420);
  const [isTabletView, setIsTabletView] = useState(window.innerWidth <= 860);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 420);
      setIsTabletView(window.innerWidth <= 860 && window.innerWidth > 420);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={styles.animationsSectionWrapper}>
      {mobileComponent !== null && !!isMobileView && !isTabletView && (
        <div>
          <InteractiveExampleComponent idx={idx} component={mobileComponent} />
        </div>
      )}
      {tabletComponent !== null && !!isTabletView && (
        <div>
          <InteractiveExampleComponent idx={idx} component={tabletComponent} />
        </div>
      )}
      {((!isMobileView && !isTabletView) ||
        (!mobileComponent && !tabletComponent)) && (
        <div>
          <InteractiveExampleComponent idx={idx} component={component} />
        </div>
      )}
      <div className={styles.animationsSection}>
        <div>
          <h4>{title}</h4>
          <p>{body}</p>
          <a href={docsLink}>
            <p>Check docs</p>
            <div className={styles.animationsSectionButtonArrow}>
              <ArrowRight />
            </div>
          </a>
        </div>

        <div className={styles.interactiveCodeBlock}>
          <CodeBlock language="jsx">{code}</CodeBlock>
        </div>
      </div>
    </div>
  );
}
