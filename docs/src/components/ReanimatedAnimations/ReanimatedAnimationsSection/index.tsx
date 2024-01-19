import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from './styles.module.css';
import InteractiveExampleComponent from '../../InteractiveExample/InteractiveExampleComponent';
import ArrowRight from '@site/static/img/examples/arrow-right-light.svg';

interface Props {
  title: string;
  body: string;
  docsLink: string;
  component: React.ReactNode;
  code: string;
  idx: number;
}

export default function ReanimatedAnimationsSection({
  title,
  body,
  docsLink,
  component,
  code,
  idx,
}: Props) {
  return (
    <div className={styles.animationsSectionWrapper}>
      <div>
        <InteractiveExampleComponent idx={idx} component={component} />
      </div>
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
