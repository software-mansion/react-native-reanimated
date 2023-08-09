import React from 'react';

import clsx from 'clsx';
import { useCopyToClipboard } from 'usehooks-ts';

import BrowserOnly from '@docusaurus/BrowserOnly';
import CodeBlock from '@theme/CodeBlock';
import AnimableIcon, { Animation } from '@site/src/components/AnimableIcon';

import Copy from '@site/static/img/copy.svg';
import CopyDark from '@site/static/img/copy-dark.svg';
import Reset from '@site/static/img/reset.svg';
import ResetDark from '@site/static/img/reset-dark.svg';

import styles from './styles.module.css';

interface Props {
  src: string;
  component: React.ReactNode;
  label?: string;
  showCode?: boolean; // whether to show code by default
  larger?: boolean; // should the view be enlarged?
}

export default function InteractiveExample({
  src,
  component,
  label,
  showCode = false,
  larger = false,
}: Props) {
  const [_, copy] = useCopyToClipboard();
  const [key, setKey] = React.useState(0);
  const [showPreview, setShowPreview] = React.useState(!showCode);

  const resetExample = () => {
    setKey(key + 1);
  };

  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div
          className={`${styles.container} ${larger && styles.largerContainer} 
          ${!showPreview ? styles.code : ''}`}
          data-ispreview={showPreview}>
          <div
            className={clsx(
              styles.buttonsContainer,
              styles.upperButtonsContainer
            )}>
            <div className={styles.actionButtonsContainer}>
              <button
                className={clsx(
                  styles.actionButton,
                  showPreview ? styles.actionButtonActive : ''
                )}
                onClick={() => setShowPreview(true)}>
                Preview
              </button>
              <button
                className={clsx(
                  styles.actionButton,
                  !showPreview ? styles.actionButtonActive : ''
                )}
                onClick={() => setShowPreview(false)}>
                Code
              </button>
            </div>
            <AnimableIcon
              icon={<Copy />}
              iconDark={<CopyDark />}
              animation={Animation.FADE_IN_OUT}
              onClick={(actionPerformed, setActionPerformed) => {
                if (!actionPerformed) {
                  copy(src);
                  setActionPerformed(true);
                }
              }}
            />
          </div>
          <div className={styles.previewContainer}>
            {showPreview ? (
              <>
                <React.Fragment key={key}>{component}</React.Fragment>

                <div
                  className={clsx(
                    styles.buttonsContainer,
                    styles.lowerButtonsContainer
                  )}>
                  <div className={styles.iconStub} />
                  {label && <div className={styles.label}>{label}</div>}
                  <AnimableIcon
                    icon={<Reset />}
                    iconDark={<ResetDark />}
                    animation={Animation.FADE_IN_OUT}
                    onClick={(actionPerformed, setActionPerformed) => {
                      if (!actionPerformed) {
                        resetExample();
                        setActionPerformed(true);
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <div className={styles.interactiveCodeBlock}>
                <CodeBlock language="jsx">{src}</CodeBlock>
              </div>
            )}
          </div>
        </div>
      )}
    </BrowserOnly>
  );
}
