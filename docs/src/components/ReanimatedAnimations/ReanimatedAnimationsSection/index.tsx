import React, { useState, useEffect } from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from './styles.module.css';
import InteractiveExampleComponent from '../../InteractiveExample/InteractiveExampleComponent';
import HomepageButton from '@site/src/components/HomepageButton';

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

export default function ReanimatedAnimationsSection({
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
  const [isMobileView, setIsMobileView] = useState(
    window.innerWidth <= MOBILE_SIZE
  );
  const [isTabletView, setIsTabletView] = useState(
    window.innerWidth <= TABLET_SIZE
  );
  const [componentToRender, setComponentToRender] = useState(component);

  const [key, setKey] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const innerWidth = window.innerWidth;
      setIsMobileView(innerWidth <= MOBILE_SIZE);
      setIsTabletView(innerWidth <= TABLET_SIZE && innerWidth > MOBILE_SIZE);

      if (innerWidth <= MOBILE_SIZE && mobileComponent !== undefined) {
        setKey(key + 1);
        setComponentToRender(mobileComponent);
      } else if (
        innerWidth <= TABLET_SIZE &&
        innerWidth > MOBILE_SIZE &&
        tabletComponent !== undefined
      ) {
        setKey(key + 1);
        setComponentToRender(tabletComponent);
      } else {
        setKey(key + 1);
        setComponentToRender(component);
      }
    };

    console.log('Resize: ', window.innerWidth);

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
          <HomepageButton
            backgroundStyling={styles.backgroundStyling}
            borderStyling={styles.borderStyling}
            href={docsLink}
            title="Check docs"
          />
        </div>

        <div className={styles.interactiveCodeBlock}>
          <CodeBlock language="jsx">{code}</CodeBlock>
        </div>
      </div>
    </div>
  );
}
