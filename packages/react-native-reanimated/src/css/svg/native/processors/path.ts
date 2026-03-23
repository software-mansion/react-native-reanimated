'use strict';

import { ReanimatedError, type ValueProcessor } from '../../../../common';
import {
  arcToCubic,
  lineToCubic,
  NUMBER_PATTERN,
  PATH_COMMAND_LENGTHS,
  quadraticToCubic,
  reflectControlPoint,
  SEGMENT_PATTERN,
} from '../../../utils';

export const ERROR_MESSAGES = {
  invalidSVGPathCommand: (command: unknown, args: unknown) =>
    `Invalid SVG Path command: ${JSON.stringify(command)} ${JSON.stringify(args)}`,
  invalidSVGPathStart: (command: string) =>
    `Invalid SVG Path: Path must start with "M" or "m", but found "${command}"`,
};

type PathCommand = [string, ...number[]];

export const processSVGPath = ((d) => {
  let pathSegments: PathCommand[] = parsePathString(d);
  pathSegments = normalizePath(pathSegments);

  return pathSegments.flatMap((subArr) => subArr).join(' ');
}) satisfies ValueProcessor<string, string>;

function processPathSegment(
  command: string,
  args: number[],
  pathSegments: PathCommand[]
): void {
  let type = command.toLowerCase();

  if (pathSegments.length === 0 && type !== 'm') {
    throw new ReanimatedError(ERROR_MESSAGES.invalidSVGPathStart(command));
  }

  let argsStartIdx = 0;

  if (type === 'm' && args.length > PATH_COMMAND_LENGTHS['m']) {
    pathSegments.push([command, ...args.slice(0, PATH_COMMAND_LENGTHS['m'])]);
    argsStartIdx += PATH_COMMAND_LENGTHS['m'];
    type = 'l'; // If m has more than 2 (length['m']) arguments, use them in implicit l commands
    command = command === 'm' ? 'l' : 'L';
  }

  do {
    if (args.length - argsStartIdx < PATH_COMMAND_LENGTHS[type]) {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidSVGPathCommand(command, args.slice(argsStartIdx))
      );
    }

    pathSegments.push([
      command,
      ...args.slice(argsStartIdx, argsStartIdx + PATH_COMMAND_LENGTHS[type]),
    ]);
    argsStartIdx += PATH_COMMAND_LENGTHS[type];
  } while (args.length - argsStartIdx !== 0);
}

function parsePathString(d: string): PathCommand[] {
  const pathSegments: PathCommand[] = [];

  d.replace(SEGMENT_PATTERN, (_, command: string, argsString: string) => {
    const numbers = argsString.match(NUMBER_PATTERN);
    const args = numbers ? numbers.map(Number) : [];

    processPathSegment(command, args, pathSegments);
    return '';
  });

  return pathSegments;
}

function normalizePath(pathSegments: PathCommand[]): PathCommand[] {
  const absoluteSegments = absolutizePath(pathSegments);
  const out: PathCommand[] = [];

  const state: PathState = {
    curX: 0,
    curY: 0,
    startX: 0,
    startY: 0,
    lastCubicCtrlX: 0,
    lastCubicCtrlY: 0,
    lastQuadCtrlX: 0,
    lastQuadCtrlY: 0,
  };

  for (const seg of absoluteSegments) {
    let cmd = seg[0];
    let args = [...seg.slice(1)] as number[];

    if (cmd === 'S') {
      const [rX, rY] = reflectControlPoint(
        state.curX,
        state.curY,
        state.lastCubicCtrlX,
        state.lastCubicCtrlY
      );
      cmd = 'C';
      args = [rX, rY, args[0], args[1], args[2], args[3]];
    } else if (cmd === 'T') {
      const [rX, rY] = reflectControlPoint(
        state.curX,
        state.curY,
        state.lastQuadCtrlX,
        state.lastQuadCtrlY
      );
      cmd = 'Q';
      args = [rX, rY, args[0], args[1]];
    }

    if (cmd === 'H') {
      cmd = 'L';
      args = [args[0], state.curY];
    }
    if (cmd === 'V') {
      cmd = 'L';
      args = [state.curX, args[0]];
    }

    const result = handlers[cmd as keyof typeof handlers](state, args);
    out.push(...result);

    const isCubic = cmd === 'C';
    const isQuad = cmd === 'Q';

    if (!isCubic) {
      state.lastCubicCtrlX = state.curX;
      state.lastCubicCtrlY = state.curY;
    }
    if (!isQuad) {
      state.lastQuadCtrlX = state.curX;
      state.lastQuadCtrlY = state.curY;
    }
  }

  return out;
}

function absolutizePath(pathSegments: PathCommand[]): PathCommand[] {
  let curX = 0,
    curY = 0;
  let startX = 0,
    startY = 0;

  return pathSegments.map((seg) => {
    const cmd = seg[0];
    const upperCmd = cmd.toUpperCase();
    const isRelative = cmd != upperCmd;

    const args = seg.slice(1) as number[];

    if (isRelative) {
      if (upperCmd === 'A') {
        args[5] += curX;
        args[6] += curY;
      } else if (upperCmd === 'V') {
        args[0] += curY;
      } else if (upperCmd === 'H') {
        args[0] += curX;
      } else {
        for (let i = 0; i < args.length; i += 2) {
          args[i] += curX;
          args[i + 1] += curY;
        }
      }
    }

    switch (upperCmd) {
      case 'Z':
        curX = startX;
        curY = startY;
        break;
      case 'H':
        curX = args[0];
        break;
      case 'V':
        curY = args[0];
        break;
      case 'M':
        curX = args[0];
        curY = args[1];
        startX = curX;
        startY = curY;
        break;
      default:
        // For L, C, S, Q, T, A the last pair is the new cursor
        if (args.length >= 2) {
          curX = args[args.length - 2];
          curY = args[args.length - 1];
        }
    }

    return [upperCmd, ...args];
  });
}

type PathState = {
  curX: number;
  curY: number;
  startX: number;
  startY: number;
  lastCubicCtrlX: number;
  lastCubicCtrlY: number;
  lastQuadCtrlX: number;
  lastQuadCtrlY: number;
};

const handlers = {
  M: (state: PathState, args: number[]): PathCommand[] => {
    const [x, y] = args;
    state.curX = state.startX = x;
    state.curY = state.startY = y;
    return [['M', x, y]];
  },

  L: (state: PathState, args: number[]): PathCommand[] => {
    const [x, y] = args;
    const cubic = lineToCubic(state.curX, state.curY, x, y);
    state.curX = x;
    state.curY = y;
    return [['C', ...cubic]];
  },

  Q: (state: PathState, args: number[]): PathCommand[] => {
    const [qcx, qcy, x, y] = args;
    const cubic = quadraticToCubic(state.curX, state.curY, qcx, qcy, x, y);
    state.lastQuadCtrlX = qcx;
    state.lastQuadCtrlY = qcy;
    state.curX = x;
    state.curY = y;
    return [['C', ...cubic]];
  },

  C: (state: PathState, args: number[]): PathCommand[] => {
    const [_cp1x, _cp1y, cp2x, cp2y, x, y] = args;
    state.lastCubicCtrlX = cp2x;
    state.lastCubicCtrlY = cp2y;
    state.curX = x;
    state.curY = y;
    return [['C', ...args]];
  },

  A: (state: PathState, args: number[]): PathCommand[] => {
    const cubics = arcToCubic(
      state.curX,
      state.curY,
      args[0],
      args[1],
      args[2],
      args[3],
      args[4],
      args[5],
      args[6]
    );
    if (cubics.length === 0) return [];

    const last = cubics[cubics.length - 1];
    state.lastCubicCtrlX = last[2];
    state.lastCubicCtrlY = last[3];
    state.curX = last[4];
    state.curY = last[5];

    return cubics.map((c) => ['C', ...c]);
  },

  Z: (state: PathState): PathCommand[] => {
    state.curX = state.startX;
    state.curY = state.startY;
    return [['Z']];
  },
};
