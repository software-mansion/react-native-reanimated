import React from 'react';
import clsx from 'clsx';
import { useCopyToClipboard } from 'usehooks-ts';

import BrowserOnly from '@docusaurus/BrowserOnly';
import CodeBlock from '@theme/CodeBlock';
import AnimableIcon, { Animation } from '@site/src/components/AnimableIcon';
import { useReducedMotion } from 'react-native-reanimated';
import ReducedMotionWarning from '../ReducedMotionWarning';

import Copy from '@site/static/img/copy.svg';
import CopyDark from '@site/static/img/copy-dark.svg';
import Reset from '@site/static/img/reset.svg';
import ResetDark from '@site/static/img/reset-dark.svg';

import styles from './styles.module.css';

import ts from 'typescript';
import prettier from 'prettier/standalone';
import babelParser from 'prettier/parser-babel';

function compileTSXtoJSX(tsxCode: string) {
  const PLACEHOLDER_FOR_EMPTY_LINES = '// PLACEHOLDER-FOR-EMPTY-LINES';
  const PLACEHOLDER_FOR_BREAKING_LINES = '// PLACEHOLDER-FOR-BREAKING-LINES';

  // Adding comments to the end of each line to avoid vanishing empty lines
  tsxCode = tsxCode
    .split('\n')
    .map((line) =>
      line.trim() === ''
        ? PLACEHOLDER_FOR_EMPTY_LINES
        : line + PLACEHOLDER_FOR_BREAKING_LINES
    )
    .join('\n');
  const result = ts.transpileModule(tsxCode, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      pretty: true,
      target: ts.ScriptTarget.ES2015,
      removeComments: false,
      noEmit: false,
      indentSize: 2,
    },
  });

  const output = result.outputText
    .split('\n')
    .map((l) =>
      l.trim() === PLACEHOLDER_FOR_EMPTY_LINES
        ? ''
        : l.trim().endsWith(PLACEHOLDER_FOR_BREAKING_LINES)
        ? l.slice(0, l.indexOf(PLACEHOLDER_FOR_BREAKING_LINES)).trimEnd()
        : l
    )
    .join('\n');

  return prettier.format(output, {
    parser: 'babel',
    bracketSameLine: true,
    printWidth: 80,
    singleQuote: true,
    trailingComma: 'es5',
    tabWidth: 2,
    arrowParens: 'always',
    plugins: [babelParser],
  });
}

interface Props {
  src: string;
  component: React.FC<{ width?: number }>;
  label?: string;
  showCode?: boolean; // whether to show code by default
  larger?: boolean; // should the view be enlarged?
}

enum Tab {
  PREVIEW,
  TYPESCRIPT,
  JAVASCRIPT,
}

export default function InteractiveExample({
  src: tsxCode,
  component: Component,
  label,
  showCode = false,
  larger = false,
}: Props) {
  const [_, copy] = useCopyToClipboard();
  const [key, setKey] = React.useState(0);
  const [tab, setTab] = React.useState<Tab>(Tab.PREVIEW);
  const [jsxCode, setJsxCode] = React.useState(() => compileTSXtoJSX(tsxCode));
  const [width, setWidth] = React.useState<number | null>(null);

  const interactiveExampleRef = React.useRef<HTMLDivElement>(null);

  const resetExample = () => {
    if (interactiveExampleRef.current) {
      setWidth(interactiveExampleRef.current.offsetWidth);
    }
    setKey(key + 1);
  };

  React.useEffect(() => {
    if (interactiveExampleRef.current) {
      setWidth(interactiveExampleRef.current.offsetWidth);
    }
  }, [interactiveExampleRef.current]);

  React.useEffect(() => {
    if (width !== null) {
      setKey(key + 1);
    }
  }, [width]);

  const prefersReducedMotion = useReducedMotion();

  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div
          ref={interactiveExampleRef}
          className={`${styles.container} ${larger && styles.largerContainer} 
          ${tab !== Tab.PREVIEW ? styles.code : ''}`}
          data-ispreview={tab === Tab.PREVIEW}>
          {tab === Tab.PREVIEW && prefersReducedMotion && (
            <ReducedMotionWarning />
          )}
          <div
            className={clsx(
              styles.buttonsContainer,
              styles.upperButtonsContainer
            )}>
            <div className={styles.actionButtonsContainer}>
              <button
                className={clsx(
                  styles.actionButton,
                  tab === Tab.PREVIEW ? styles.actionButtonActive : ''
                )}
                onClick={() => setTab(Tab.PREVIEW)}>
                Preview
              </button>
              <button
                className={clsx(
                  styles.actionButton,
                  tab === Tab.TYPESCRIPT ? styles.actionButtonActive : ''
                )}
                onClick={() => setTab(Tab.TYPESCRIPT)}>
                TS
              </button>
              <button
                className={clsx(
                  styles.actionButton,
                  tab === Tab.JAVASCRIPT ? styles.actionButtonActive : ''
                )}
                onClick={() => setTab(Tab.JAVASCRIPT)}>
                JS
              </button>
            </div>
            <AnimableIcon
              icon={<Copy />}
              iconDark={<CopyDark />}
              animation={Animation.FADE_IN_OUT}
              onClick={(actionPerformed, setActionPerformed) => {
                if (!actionPerformed) {
                  copy(tab === Tab.JAVASCRIPT ? jsxCode : tsxCode);
                  setActionPerformed(true);
                }
              }}
            />
          </div>
          <div className={styles.previewContainer}>
            {tab === Tab.PREVIEW ? (
              <>
                <React.Fragment key={key}>
                  <Component width={width !== null ? width : 0} />
                </React.Fragment>

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
            ) : tab === Tab.TYPESCRIPT ? (
              <div className={styles.interactiveCodeBlock}>
                <CodeBlock language="tsx">{tsxCode}</CodeBlock>
              </div>
            ) : (
              <div className={styles.interactiveCodeBlock}>
                <CodeBlock language="jsx">{jsxCode}</CodeBlock>
              </div>
            )}
          </div>
        </div>
      )}
    </BrowserOnly>
  );
}
