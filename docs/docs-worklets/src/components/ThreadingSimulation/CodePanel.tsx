import React from 'react';
import clsx from 'clsx';
import { Highlight } from 'prism-react-renderer';
import { usePrismTheme } from '@docusaurus/theme-common';

import type { CoreSnapshot } from '@site/src/simulation';

import styles from './styles.module.css';
import { runtimeClass } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';

export type LineHistory = Map<number, Map<string, number>>;

interface CodePanelProps {
  code: string;
  runtimes: RuntimeDescriptor[];
  cores: CoreSnapshot[];
  rawToDisplayLine: number[];
  blockEnds: Map<number, number>;
  history: LineHistory;
  settled: boolean;
  columns?: number;
}

export default function CodePanel({
  code,
  runtimes,
  cores,
  rawToDisplayLine,
  blockEnds,
  history,
  settled,
  columns = 1,
}: CodePanelProps) {
  const blockStartOf = new Map<number, number>();
  for (const [start, end] of blockEnds) {
    for (let line = start; line <= end; line++) {
      blockStartOf.set(line, start);
    }
  }
  const prismTheme = usePrismTheme();
  const indexOf = new Map(
    runtimes.map((runtime, index) => [runtime.id, index])
  );
  const activeByLine = new Map<number, string[]>();
  for (const core of cores) {
    if (!settled || core.line === null) {
      continue;
    }
    const displayLine = rawToDisplayLine[core.line] ?? -1;
    if (displayLine < 0) {
      continue;
    }
    activeByLine.set(displayLine, [
      ...(activeByLine.get(displayLine) ?? []),
      core.id,
    ]);
  }
  const classFor = (id: string) => {
    const index = indexOf.get(id) ?? 0;
    return runtimeClass(runtimes[index]);
  };

  return (
    <Highlight code={code.trimEnd()} language="javascript" theme={prismTheme}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <div
          className={clsx(
            styles.codeList,
            columns > 1 && styles.codeListColumns
          )}
          style={columns > 1 ? { columnCount: columns } : undefined}>
          {chunkLines(tokens, blockStartOf).map((chunk, chunkIndex) => (
            <div key={chunkIndex} className={styles.codeChunk}>
              {chunk.map(({ line, lineNumber }) => {
                const blockStart = blockStartOf.get(lineNumber) ?? lineNumber;
                const active = activeByLine.get(blockStart) ?? [];
                const executed = history.get(blockStart);
                const inBlock = blockStart !== lineNumber;
                const blockEnd = blockEnds.get(blockStart);
                const recent =
                  executed === undefined
                    ? undefined
                    : [...executed].sort((a, b) => a[1] - b[1])[0];
                const primary = active[0] ?? recent?.[0];
                const age = recent?.[1];
                return (
                  <div
                    key={lineNumber}
                    {...getLineProps({ line })}
                    className={clsx(
                      styles.codeLine,
                      blockEnd !== undefined && styles.codeBlockStart,
                      inBlock && styles.codeBlockInner,
                      inBlock && lineNumber === blockEnd && styles.codeBlockEnd,
                      primary !== undefined && classFor(primary),
                      active.length > 0 && styles.codeLineActive,
                      active.length === 0 && age === 1 && styles.codeLineDone1,
                      active.length === 0 && age === 2 && styles.codeLineDone2,
                      active.length === 0 && age === 3 && styles.codeLineDone3
                    )}>
                    <span className={styles.codeText}>
                      {line.map((token, tokenIndex) => (
                        <span key={tokenIndex} {...getTokenProps({ token })} />
                      ))}
                    </span>
                    {active.length > 1 && !inBlock && (
                      <span className={styles.codeDots}>
                        {active.map((id) => (
                          <span
                            key={id}
                            className={clsx(styles.codeDot, classFor(id))}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Highlight>
  );
}

function chunkLines<Line extends { content: string }[]>(
  tokens: Line[],
  blockStartOf: Map<number, number>
): { line: Line; lineNumber: number }[][] {
  const chunks: { line: Line; lineNumber: number }[][] = [];
  let current: { line: Line; lineNumber: number }[] = [];
  tokens.forEach((line, index) => {
    const lineNumber = index + 1;
    const blockStart = blockStartOf.get(lineNumber) ?? lineNumber;
    const isBlank = line.every((token) => token.content.trim() === '');
    if (isBlank && blockStart === lineNumber) {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
      }
      return;
    }
    current.push({ line, lineNumber });
  });
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}
