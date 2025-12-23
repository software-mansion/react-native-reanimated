'use strict';

export const PATH_COMMAND_LENGTHS: Record<string, number> = {
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

export const SEGMENT_PATTERN = /([achlmqstvz])([^achlmqstvz]*)/gi;
export const NUMBER_PATTERN = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/gi;

export function reflectControlPoint(
  curX: number,
  curY: number,
  oldX: number,
  oldY: number
): [number, number] {
  return [2 * curX - oldX, 2 * curY - oldY];
}

export function quadraticToCubic(
  curX: number,
  curY: number,
  qcx: number,
  qcy: number,
  x: number,
  y: number
): [number, number, number, number, number, number] {
  const cp1x = curX + (2 / 3) * (qcx - curX);
  const cp1y = curY + (2 / 3) * (qcy - curY);
  const cp2x = x + (2 / 3) * (qcx - x);
  const cp2y = y + (2 / 3) * (qcy - y);
  return [cp1x, cp1y, cp2x, cp2y, x, y];
}

export function arcToCubic(
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
  // Identical endpoints -- omit the segment
  if (px === x && py === y) {
    return [];
  }

  rx = Math.abs(rx);
  ry = Math.abs(ry);

  // Degenerate case:
  if (rx === 0 || ry === 0) {
    const cp1x = px + (x - px) / 3;
    const cp1y = py + (y - py) / 3;
    const cp2x = px + (2 * (x - px)) / 3;
    const cp2y = py + (2 * (y - py)) / 3;
    return [[cp1x, cp1y, cp2x, cp2y, x, y]];
  }

  const fA = largeArcFlag !== 0 ? 1 : 0;
  const fS = sweepFlag !== 0 ? 1 : 0;

  const phi = ((xAxisRotation % 360) * Math.PI) / 180;
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

  const sign = fA === fS ? -1 : 1;
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

  if (fS === 0 && deltaAngle > 0) deltaAngle -= 2 * Math.PI;
  if (fS === 1 && deltaAngle < 0) deltaAngle += 2 * Math.PI;

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

    const unitX1 = cos1 - k * sin1;
    const unitY1 = sin1 + k * cos1;
    const unitX2 = cos2 + k * sin2;
    const unitY2 = sin2 - k * cos2;

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
