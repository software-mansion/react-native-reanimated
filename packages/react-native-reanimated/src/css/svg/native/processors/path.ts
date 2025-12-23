'use strict';

import { ReanimatedError, type ValueProcessor } from '../../../../common';
import {
  arcToCubic,
  NUMBER_PATTERN,
  PATH_COMMAND_LENGTHS,
  quadraticToCubic,
  reflectControlPoint,
  SEGMENT_PATTERN,
} from '../../../utils/pathUtils';

export const ERROR_MESSAGES = {
  invalidSVGPathCommand: (command: unknown, args: unknown) =>
    `Invalid SVG Path command: ${JSON.stringify(command)} ${JSON.stringify(args)}`,
  invalidSVGPathStart: (command: string) =>
    `Invalid SVG Path: Path must start with "M" or "m", but found "${command}"`,
};

type PathCommand = [string, ...number[]];

export const processSVGPath: ValueProcessor<string, string> = (d) => {
  let pathSegments: PathCommand[] = parsePathString(d);
  pathSegments = normalizePath(pathSegments);

  const tmpFlat = pathSegments.flatMap((subArr) => subArr);

  return tmpFlat.join(' ');
};

function parsePathString(d: string): PathCommand[] {
  const pathSegments: PathCommand[] = [];

  d.replace(SEGMENT_PATTERN, (_, command: string, argsString: string) => {
    let type = command.toLowerCase();
    const numbers = argsString.match(NUMBER_PATTERN);
    const args = numbers ? numbers.map(Number) : [];

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

    while (true) {
      if (args.length - argsStartIdx < PATH_COMMAND_LENGTHS[type]) {
        throw new ReanimatedError(
          ERROR_MESSAGES.invalidSVGPathCommand(
            command,
            args.slice(argsStartIdx)
          )
        );
      }

      pathSegments.push([
        command,
        ...args.slice(argsStartIdx, argsStartIdx + PATH_COMMAND_LENGTHS[type]),
      ]);
      argsStartIdx += PATH_COMMAND_LENGTHS[type];

      if (args.length - argsStartIdx === 0) {
        return '';
      }
    }
  });

  return pathSegments;
}

function normalizePath(pathSegments: PathCommand[]): PathCommand[] {
  const absoluteSegments = absolutizePath(pathSegments);
  const out: PathCommand[] = [];

  let curX = 0,
    curY = 0;
  let startX = 0,
    startY = 0;

  // Last control point used for S only reflects C/S; T only reflects Q/T.
  let lastCubicCtrlX = 0,
    lastCubicCtrlY = 0;
  let lastQuadCtrlX = 0,
    lastQuadCtrlY = 0;

  for (const seg of absoluteSegments) {
    let cmd = seg[0];
    let args = [...seg.slice(1)] as number[];

    let isCubicChain = false;
    let isQuadChain = false;

    if (cmd === 'S') {
      const [rX, rY] = reflectControlPoint(
        curX,
        curY,
        lastCubicCtrlX,
        lastCubicCtrlY
      );
      cmd = 'C';
      args = [rX, rY, args[0], args[1], args[2], args[3]];
      isCubicChain = true;
    } else if (cmd === 'T') {
      const [rX, rY] = reflectControlPoint(
        curX,
        curY,
        lastQuadCtrlX,
        lastQuadCtrlY
      );
      cmd = 'Q';
      args = [rX, rY, args[0], args[1]];
      isQuadChain = true;
    }

    if (cmd === 'H') {
      args = [args[0], curY];
      cmd = 'L';
    } else if (cmd === 'V') {
      args = [curX, args[0]];
      cmd = 'L';
    }

    if (cmd === 'M') {
      curX = args[0];
      curY = args[1];
      startX = curX;
      startY = curY;
      out.push(['M', curX, curY]);
    } else if (cmd === 'L') {
      const [x, y] = args;
      const cp1x = curX + (x - curX) / 3;
      const cp1y = curY + (y - curY) / 3;
      const cp2x = curX + (2 * (x - curX)) / 3;
      const cp2y = curY + (2 * (y - curY)) / 3;
      out.push(['C', cp1x, cp1y, cp2x, cp2y, x, y]);
      curX = x;
      curY = y;
    } else if (cmd === 'Q') {
      const [qcx, qcy, x, y] = args;
      isQuadChain = true;
      out.push(['C', ...quadraticToCubic(curX, curY, qcx, qcy, x, y)]);
      lastQuadCtrlX = qcx;
      lastQuadCtrlY = qcy;
      curX = x;
      curY = y;
    } else if (cmd === 'C') {
      isCubicChain = true;
      out.push(['C', ...args]);
      lastCubicCtrlX = args[2];
      lastCubicCtrlY = args[3];
      curX = args[4];
      curY = args[5];
    } else if (cmd === 'A') {
      const cubics = arcToCubic(
        curX,
        curY,
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6]
      );
      if (cubics.length > 0) {
        isCubicChain = true;
        for (const cArgs of cubics) {
          out.push(['C', ...cArgs]);
        }
        const last = cubics[cubics.length - 1];
        curX = last[4];
        curY = last[5];
        lastCubicCtrlX = last[2];
        lastCubicCtrlY = last[3];
      }
    } else if (cmd === 'Z') {
      out.push(['Z']);
      curX = startX;
      curY = startY;
    }

    if (!isCubicChain) {
      lastCubicCtrlX = curX;
      lastCubicCtrlY = curY;
    }

    if (!isQuadChain) {
      lastQuadCtrlX = curX;
      lastQuadCtrlY = curY;
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
