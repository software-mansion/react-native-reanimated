'use strict';

import { ReanimatedError, type ValueProcessor } from '../../../../common';

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

const length: Record<string, number> = {
  a: 7,
  c: 6,
  h: 1,
  l: 2,
  m: 2,
  q: 4,
  s: 4,
  t: 2,
  v: 1,
  z: 0,
};

const segmentPattern = /([achlmqstvz])([^achlmqstvz]*)/gi;
const numberPattern = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/gi;

function parsePathString(d: string): PathCommand[] {
  const pathSegments: PathCommand[] = [];

  d.replace(segmentPattern, (_, command: string, argsString: string) => {
    let type = command.toLowerCase();
    const numbers = argsString.match(numberPattern);
    const args = numbers ? numbers.map(Number) : [];

    if (pathSegments.length === 0 && type !== 'm') {
      throw new ReanimatedError(ERROR_MESSAGES.invalidSVGPathStart(command));
    }

    let argsStartIdx = 0;

    if (type === 'm' && args.length > length['m']) {
      pathSegments.push([command, ...args.slice(0, length['m'])]);
      argsStartIdx += length['m'];
      type = 'l'; // If m has more than 2 (length['m']) arguments, use them in implicit l commands
      command = command === 'm' ? 'l' : 'L';
    }

    while (true) {
      if (args.length - argsStartIdx < length[type]) {
        throw new ReanimatedError(
          ERROR_MESSAGES.invalidSVGPathCommand(
            command,
            args.slice(argsStartIdx)
          )
        );
      }

      pathSegments.push([
        command,
        ...args.slice(argsStartIdx, argsStartIdx + length[type]),
      ]);
      argsStartIdx += length[type];

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
  // Last control point used for S and T commands.
  // If previous command wasn't a curve, these default to curX, curY.
  let ctrlX = 0,
    ctrlY = 0;

  // Reflect the control point around the current point: R = P + (P - C)
  const reflect = (
    x: number,
    y: number,
    oldCtrlX: number,
    oldCtrlY: number
  ) => {
    return [x + (x - oldCtrlX), y + (y - oldCtrlY)];
  };

  for (const seg of absoluteSegments) {
    let cmd = seg[0];
    let args = seg.slice(1) as number[];

    let nextCtrlX: number | null = null;
    let nextCtrlY: number | null = null;

    if (cmd === 'H') {
      // H x -> L x curY
      cmd = 'L';
      args = [args[0], curY];
    } else if (cmd === 'V') {
      // V y -> L curX y
      cmd = 'L';
      args = [curX, args[0]];
    } else if (cmd === 'S') {
      // S x2 y2 x y -> C (reflected ctrl) x2 y2 x y
      const [rX, rY] = reflect(curX, curY, ctrlX, ctrlY);
      cmd = 'C';
      args = [rX, rY, args[0], args[1], args[2], args[3]];
    } else if (cmd === 'T') {
      // T x y -> Q (reflected ctrl) x y
      const [rX, rY] = reflect(curX, curY, ctrlX, ctrlY);
      cmd = 'Q';
      args = [rX, rY, args[0], args[1]];
    }

    if (cmd === 'L') {
      // L x y -> C (aligned ctrl) x y
      const x = args[0];
      const y = args[1];

      const cp1x = curX + (x - curX) / 3;
      const cp1y = curY + (y - curY) / 3;
      const cp2x = curX + (2 * (x - curX)) / 3;
      const cp2y = curY + (2 * (y - curY)) / 3;

      // So C command doesn't use 'virtual' ctrl points
      nextCtrlX = x;
      nextCtrlY = y;

      cmd = 'C';
      args = [cp1x, cp1y, cp2x, cp2y, x, y];
    } else if (cmd === 'Q') {
      // Q cpX cpY x y -> C (degree elevated) x y
      const qCpX = args[0];
      const qCpY = args[1];
      const x = args[2];
      const y = args[3];

      // This ensures a subsequent 'T' command reflects correctly.
      nextCtrlX = qCpX;
      nextCtrlY = qCpY;

      const cp1x = curX + (2 / 3) * (qCpX - curX);
      const cp1y = curY + (2 / 3) * (qCpY - curY);
      const cp2x = x + (2 / 3) * (qCpX - x);
      const cp2y = y + (2 / 3) * (qCpY - y);

      cmd = 'C';
      args = [cp1x, cp1y, cp2x, cp2y, x, y];
    } else if (cmd === 'A') {
      // A rx ry rot large sweep x y -> Multiple C commands
      // Because A expands to multiple segments, we handle it explicitly here
      // and skip the generic output phase.
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

      for (const cubicArgs of cubics) {
        out.push(['C', ...cubicArgs]);
      }

      const last = cubics[cubics.length - 1];
      curX = last[4];
      curY = last[5];
      ctrlX = last[2];
      ctrlY = last[3];

      continue;
    }

    out.push([cmd, ...args]);

    if (cmd === 'M') {
      curX = args[0];
      curY = args[1];
      startX = curX;
      startY = curY;
      ctrlX = curX;
      ctrlY = curY;
    } else if (cmd === 'C') {
      curX = args[4];
      curY = args[5];

      // If we converted Q->C, we must use the Q control point.
      // Otherwise, we use the C control point (args[2], args[3]).
      if (nextCtrlX !== null && nextCtrlY !== null) {
        ctrlX = nextCtrlX;
        ctrlY = nextCtrlY;
      } else {
        ctrlX = args[2];
        ctrlY = args[3];
      }
    } else if (cmd === 'Z') {
      curX = startX;
      curY = startY;
      ctrlX = curX;
      ctrlY = curY;
    }
  }

  return out;
}

function arcToCubic(
  px: number,
  py: number,
  rx: number,
  ry: number,
  xAxisRotation: number,
  largeArcFlag: number,
  sweepFlag: number,
  x: number,
  y: number
): number[][] {
  const radian = (deg: number) => (deg * Math.PI) / 180;

  // Degenerate case:
  if (rx === 0 || ry === 0) {
    const cp1x = px + (x - px) / 3;
    const cp1y = py + (y - py) / 3;
    const cp2x = px + (2 * (x - px)) / 3;
    const cp2y = py + (2 * (y - py)) / 3;
    return [[cp1x, cp1y, cp2x, cp2y, x, y]];
  }

  const phi = radian(xAxisRotation);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);

  // endpoint parameterization -> center parameterization
  const pxp = (cosPhi * (px - x)) / 2 + (sinPhi * (py - y)) / 2;
  const pyp = (-sinPhi * (px - x)) / 2 + (cosPhi * (py - y)) / 2;

  const rxSq = rx * rx;
  const rySq = ry * ry;
  const pxpSq = pxp * pxp;
  const pypSq = pyp * pyp;

  const radCheck = pxpSq / rxSq + pypSq / rySq;
  if (radCheck > 1) {
    const scale = Math.sqrt(radCheck);
    rx *= scale;
    ry *= scale;
  }

  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const numerator = Math.max(0, rxSq * rySq - rxSq * pypSq - rySq * pxpSq);
  const denominator = rxSq * pypSq + rySq * pxpSq;
  const coef = sign * Math.sqrt(numerator / denominator);

  const cxp = coef * ((rx * pyp) / ry);
  const cyp = coef * (-(ry * pxp) / rx);

  const cx = cosPhi * cxp - sinPhi * cyp + (px + x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (py + y) / 2;

  const angle = (uX: number, uY: number, vX: number, vY: number) => {
    const acosSign = uX * vY - uY * vX < 0 ? -1 : 1;
    const dot = uX * vX + uY * vY;
    const ratio =
      dot / (Math.sqrt(uX * uX + uY * uY) * Math.sqrt(vX * vX + vY * vY));
    return acosSign * Math.acos(Math.max(-1, Math.min(1, ratio)));
  };

  const startVectorX = (pxp - cxp) / rx;
  const startVectorY = (pyp - cyp) / ry;
  const endVectorX = (-pxp - cxp) / rx;
  const endVectorY = (-pyp - cyp) / ry;

  const startAngle = angle(1, 0, startVectorX, startVectorY);
  let deltaAngle = angle(startVectorX, startVectorY, endVectorX, endVectorY);

  if (sweepFlag === 0 && deltaAngle > 0) deltaAngle -= 2 * Math.PI;
  if (sweepFlag === 1 && deltaAngle < 0) deltaAngle += 2 * Math.PI;

  // Split into segments
  const segments = Math.ceil(Math.abs(deltaAngle) / (Math.PI / 2));
  const segmentAngle = deltaAngle / segments;
  const k = (4 / 3) * Math.tan(segmentAngle / 4);

  const cubics: number[][] = [];

  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + i * segmentAngle;
    const a2 = startAngle + (i + 1) * segmentAngle;

    const cos1 = Math.cos(a1),
      sin1 = Math.sin(a1);
    const cos2 = Math.cos(a2),
      sin2 = Math.sin(a2);

    // Calc control points on unit circle
    // p1 = (cos1, sin1)
    // p2 = (cos2, sin2)
    // cp1 = p1 + k * (-sin1, cos1)
    // cp2 = p2 - k * (-sin2, cos2)
    const unitX1 = cos1 - k * sin1;
    const unitY1 = sin1 + k * cos1;
    const unitX2 = cos2 + k * sin2;
    const unitY2 = sin2 - k * cos2;

    // Transform to ellipse
    const transform = (uX: number, uY: number) => [
      cx + cosPhi * uX * rx - sinPhi * uY * ry,
      cy + sinPhi * uX * rx + cosPhi * uY * ry,
    ];

    const [cp1x, cp1y] = transform(unitX1, unitY1);
    const [cp2x, cp2y] = transform(unitX2, unitY2);
    const [dstX, dstY] = transform(cos2, sin2);

    cubics.push([cp1x, cp1y, cp2x, cp2y, dstX, dstY]);
  }

  return cubics;
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
