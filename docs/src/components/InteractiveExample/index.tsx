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

import ts from "typescript";
import prettier from "prettier/standalone";
import babelParser from 'prettier/parser-babel';

import { lightGreen } from '@mui/material/colors';
import { plugins } from '@site/babel.config';

function compileTSXtoJSX(tsxCode) {
  const TEXT_TO_REPLACE_1 = "// 1-COMMENT-TO-REPLACE";
  const TEXT_TO_REPLACE_2 = "// 2-COMMENT-TO-REPLACE";

  tsxCode = tsxCode.split("\n").map((line) => line.trim() === "" ? TEXT_TO_REPLACE_1 : line + TEXT_TO_REPLACE_2).join("\n");
  const result = ts.transpileModule(tsxCode, {
      compilerOptions: {
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.Preserve,
          pretty: true,
          target: ts.ScriptTarget.ES2015,
          removeComments: false,
          noEmit: false,
          indentSize: 2
      }
  });

  const output = result.outputText.split("\n").map((line, index) => {
    // line.trim() === TEXT_TO_REPLACE ? "" : line.endsWith("// test cmd") ? line.slice(0, line.indexOf("// test cmd")) + '\n' : line;

    if (line.trim() === TEXT_TO_REPLACE_1) {
      return "";
    } else if (line.includes(TEXT_TO_REPLACE_2)) {
      line = line.slice(0, line.indexOf(TEXT_TO_REPLACE_2)).trimEnd();

      if (line === '')
        return null;

      return line;
    } else {
      return line;
    }
  }).filter(line => line !== null).join("\n");

  return prettier.format(output, {
    parser: 'babel',
    bracketSameLine: true,
    printWidth: 80,
    singleQuote: true,
    trailingComma: 'es5',
    tabWidth: 2,
    arrowParens: 'always',
    plugins: [babelParser]
  });

  // return output.split('\n').map(line => {
  //   const n = (line.length - line.trimStart().length);

  //   if (n === 0)
  //     return line;

  //   return line.slice(Math.floor(n / 2));
  // }).join('\n');
}

interface Props {
  src: string;
  component: React.ReactNode;
  label?: string;
  showCode?: boolean; // whether to show code by default
  larger?: boolean; // should the view be enlarged?
}

enum Tab {
  PREVIEW,
  TYPESCRIPT,
  JAVASCRIPT
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
  const [tab, setTab] = React.useState<Tab>(Tab.PREVIEW);
  const [jsxCode, setJsxCode] = React.useState(compileTSXtoJSX(src));

  const resetExample = () => {
    setKey(key + 1);
  };

  const prefersReducedMotion = useReducedMotion();

  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div
          className={`${styles.container} ${larger && styles.largerContainer} 
          ${tab !== Tab.PREVIEW ? styles.code : ''}`}
          data-ispreview={tab === Tab.PREVIEW}>
          {tab === Tab.PREVIEW && prefersReducedMotion && <ReducedMotionWarning />}
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
                  copy(tab === Tab.JAVASCRIPT ? jsxCode : src);
                  setActionPerformed(true);
                }
              }}
            />
          </div>
          <div className={styles.previewContainer}>
            {tab === Tab.PREVIEW ? (
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
            ) : tab === Tab.TYPESCRIPT ? (
              <div className={styles.interactiveCodeBlock}>
                <CodeBlock language="tsx">{src}</CodeBlock>
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
