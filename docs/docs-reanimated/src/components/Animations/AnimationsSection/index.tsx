import React, { forwardRef } from 'react';
import clsx from 'clsx';
import CodeBlock from '@theme/CodeBlock';
import styles from './styles.module.css';
import HomepageButton from '@site/src/components/HomepageButton';
import Phone, { PhoneMotion } from '../Phone';

export interface Section {
  id: string;
  title: string;
  body: string;
  code: string;
  docsLink: string;
  render: () => React.ReactNode;
  hint?: string;
  motion?: PhoneMotion;
}

interface Props {
  section: Section;
  index: number;
  active: boolean;
  withPhone: boolean;
}

const AnimationsSection = forwardRef<HTMLLIElement, Props>(
  function AnimationsSection({ section, index, active, withPhone }, ref) {
    return (
      <li
        ref={ref}
        id={section.id}
        data-index={index}
        className={clsx(styles.chapter, active && styles.active)}>
        {withPhone && (
          <div className={styles.inlinePhone}>
            <Phone
              compact
              title={section.title}
              hint={section.hint}
              motion={section.motion}
              screenKey={section.id}
              render={section.render}
            />
          </div>
        )}
        <div className={styles.copy}>
          <h3 className={styles.title}>{section.title}</h3>
          <p className={styles.body}>{section.body}</p>
        </div>
        <div className={styles.code}>
          <CodeBlock language="jsx">{section.code}</CodeBlock>
        </div>
        <div className={styles.buttonContainer}>
          <HomepageButton
            backgroundStyling={styles.backgroundStyling}
            borderStyling={styles.borderStyling}
            href={section.docsLink}
            title="Check docs"
          />
        </div>
      </li>
    );
  }
);

export default AnimationsSection;
