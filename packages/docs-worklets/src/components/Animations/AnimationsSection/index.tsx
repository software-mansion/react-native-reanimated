import React, { useState, useEffect } from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from './styles.module.css';
import InteractiveExampleComponent from '../../InteractiveExample/InteractiveExampleComponent';
import HomepageButton from '@site/src/components/HomepageButton';
import useScreenSize from '@site/src/hooks/useScreenSize';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const MOBILE_SIZE = 420;
const TABLET_SIZE = 860;

interface Props {
  title: string;
  body: string;
  docsLink: string;
  component: React.ReactNode;
  mobileComponent: React.ReactNode;
  tabletComponent: React.ReactNode;
  code: string;
  label?: string;
  idx: number;
}

export default function AnimationsSection({
  title,
  body,
  docsLink,
  component,
  mobileComponent,
  tabletComponent,
  code,
  label,
  idx,
}: Props) {
  const { windowWidth } =
    ExecutionEnvironment.canUseViewport && useScreenSize();
  const [isMobileView, setIsMobileView] = useState(windowWidth <= MOBILE_SIZE);
  const [isTabletView, setIsTabletView] = useState(windowWidth <= TABLET_SIZE);
  const [componentToRender, setComponentToRender] = useState(component);

  const [key, setKey] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(windowWidth <= MOBILE_SIZE);
      setIsTabletView(windowWidth <= TABLET_SIZE && windowWidth > MOBILE_SIZE);

      if (windowWidth <= MOBILE_SIZE && mobileComponent !== undefined) {
        setKey(key + 1);
        setComponentToRender(mobileComponent);
      } else if (
        windowWidth <= TABLET_SIZE &&
        windowWidth > MOBILE_SIZE &&
        tabletComponent !== undefined
      ) {
        setKey(key + 1);
        setComponentToRender(tabletComponent);
      } else {
        setKey(key + 1);
        setComponentToRender(component);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileView, isTabletView]);

  return (
    <div id={idx.toString()} className={styles.animationsSectionWrapper}>
      <div>
        <InteractiveExampleComponent
          idx={key}
          label={label}
          component={componentToRender}
        />
      </div>
      <div className={styles.animationsSection}>
        <div>
          <h4>{title}</h4>
          <p>{body}</p>
          <div className={styles.buttonContainer}>
            <HomepageButton
              backgroundStyling={styles.backgroundStyling}
              borderStyling={styles.borderStyling}
              href={docsLink}
              title="Check docs"
            />
          </div>
        </div>

        <div className={styles.interactiveCodeBlock}>
          <CodeBlock language="jsx">{code}</CodeBlock>
        </div>
      </div>
    </div>
  );
}
