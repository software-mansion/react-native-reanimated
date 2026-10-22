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
  tickMs: number;
  columns?: number;
}

interface CodeListProps {
  code: string;
  runtimes: RuntimeDescriptor[];
  cores: CoreSnapshot[];
  rawToDisplayLine: number[];
  blockEnds: Map<number, number>;
  history: LineHistory;
  tickMs: number;
  columns: number;
  className?: string;
}

export default function CodePanel({ columns = 1, ...list }: CodePanelProps) {
  return <CodeList {...list} columns={columns} />;
}

function CodeList({
  code,
  runtimes,
  cores,
  rawToDisplayLine,
  blockEnds,
  history,
  tickMs,
  columns,
  className,
}: CodeListProps) {
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
    if (core.line === null) {
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
            columns > 1 && styles.codeListColumns,
            className
          )}
          tabIndex={0}
          role="region"
          aria-label="Example source code"
          style={
            {
              columnCount: columns > 1 ? columns : undefined,
              '--code-fade-ms': `${Math.max(100, tickMs)}ms`,
              '--code-rise-ms': `${Math.min(80, tickMs / 2)}ms`,
            } as React.CSSProperties
          }>
          {chunkLines(tokens, blockStartOf).map((chunk, chunkIndex) => (
            <div key={chunkIndex} className={styles.codeChunk}>
              {chunk.map(({ line, lineNumber }) => {
                const blockStart = blockStartOf.get(lineNumber) ?? lineNumber;
                const active = activeByLine.get(blockStart) ?? [];
                const executed = history.get(blockStart);
                const inBlock = blockStart !== lineNumber;
                const blockEnd = blockEnds.get(blockStart);
                return (
                  <div
                    key={lineNumber}
                    {...getLineProps({ line })}
                    data-sim-code={
                      active.length > 0 && !inBlock
                        ? active.join(' ')
                        : undefined
                    }
                    className={clsx(
                      styles.codeLine,
                      blockEnd !== undefined && styles.codeBlockStart,
                      inBlock && styles.codeBlockInner,
                      inBlock && lineNumber === blockEnd && styles.codeBlockEnd
                    )}>
                    {/* Keep each colour mounted so its background and edge fade together. */}
                    {runtimes.map((runtime) => {
                      const isActive = active.includes(runtime.id);
                      const age = executed?.get(runtime.id);
                      return (
                        <span
                          key={runtime.id}
                          aria-hidden="true"
                          className={clsx(
                            styles.codeHighlight,
                            classFor(runtime.id),
                            isActive && styles.codeHighlightActive
                          )}
                          style={{
                            opacity: isActive
                              ? 1
                              : ([0.65, 0.65, 0.4, 0.2][age ?? -1] ?? 0),
                          }}
                        />
                      );
                    })}
                    <span className={styles.lineNumber} aria-hidden="true">
                      {lineNumber}
                    </span>
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
