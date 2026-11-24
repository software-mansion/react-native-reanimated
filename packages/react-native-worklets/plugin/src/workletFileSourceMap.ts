import type { BabelFile } from '@babel/core';
import { traverse } from '@babel/core';
import type { SourceLocation } from '@babel/types';
import {
  GREATEST_LOWER_BOUND,
  LEAST_UPPER_BOUND,
  originalPositionFor,
  TraceMap,
} from '@jridgewell/trace-mapping';

const SOURCE_MAP_COMMENT_PREFIX = '# workletSourceMap=';
const ORIGIN_COMMENT_PREFIX = ' __workletOrigin:';
const restoredFiles = new WeakSet<BabelFile>();

export function appendWorkletSourceMap(code: string, map: object): string {
  const encoded = Buffer.from(JSON.stringify(map)).toString('base64');
  return `${code}\n//${SOURCE_MAP_COMMENT_PREFIX}${encoded}\n`;
}

export function restoreWorkletFileLocations(file: BabelFile) {
  if (restoredFiles.has(file)) {
    return;
  }
  restoredFiles.add(file);

  const comments = file.ast.comments ?? [];
  const sourceMapComment = comments.find((comment) =>
    comment.value.startsWith(SOURCE_MAP_COMMENT_PREFIX)
  );
  if (!sourceMapComment) {
    return;
  }

  const map = new TraceMap(
    Buffer.from(
      sourceMapComment.value.slice(SOURCE_MAP_COMMENT_PREFIX.length),
      'base64'
    ).toString('utf8')
  );
  const lineOffset =
    comments[0]?.value.startsWith(ORIGIN_COMMENT_PREFIX) &&
    comments[0].loc?.start.line === 1
      ? 1
      : 0;

  const toOriginal = (position: SourceLocation['start']) => {
    const needle = {
      line: position.line - lineOffset,
      column: position.column,
    };
    const lower = originalPositionFor(map, {
      ...needle,
      bias: GREATEST_LOWER_BOUND,
    });
    const original =
      lower.line !== null
        ? lower
        : originalPositionFor(map, { ...needle, bias: LEAST_UPPER_BOUND });
    if (original.line === null) {
      return null;
    }
    return {
      position: { line: original.line, column: original.column, index: 0 },
      source: original.source,
    };
  };

  let lastStart: ReturnType<typeof toOriginal> = null;
  traverse(file.ast, {
    enter(path) {
      const { loc } = path.node;
      if (!loc || path.isProgram()) {
        return;
      }
      const start = toOriginal(loc.start) ?? lastStart;
      if (!start) {
        return;
      }
      lastStart = start;
      path.node.loc = {
        ...loc,
        filename: start.source ?? loc.filename,
        start: start.position,
        end: toOriginal(loc.end)?.position ?? start.position,
      };
    },
  });
}
