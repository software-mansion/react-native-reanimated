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

export function lineToCubic(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number[] {
  return [
    x1 + (x2 - x1) / 3,
    y1 + (y2 - y1) / 3,
    x1 + (2 * (x2 - x1)) / 3,
    y1 + (2 * (y2 - y1)) / 3,
    x2,
    y2,
  ];
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
  startX: number,
  startY: number,
  radiusX: number,
  radiusY: number,
  xAxisRotation: number,
  largeArcFlag: number,
  sweepFlag: number,
  endX: number,
  endY: number
): number[][] {
  // Identical endpoints -- omit the segment
  if (startX === endX && startY === endY) {
    return [];
  }

  radiusX = Math.abs(radiusX);
  radiusY = Math.abs(radiusY);

  // Degenerate case:
  if (radiusX === 0 || radiusY === 0) {
    return [lineToCubic(startX, startY, endX, endY)];
  }

  const fA = largeArcFlag !== 0 ? 1 : 0;
  const fS = sweepFlag !== 0 ? 1 : 0;

  const phi = ((xAxisRotation % 360) * Math.PI) / 180;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);

  const {
    centerX,
    centerY,
    startAngle,
    deltaAngle,
    correctedRadiusX,
    correctedRadiusY,
  } = getCenterParameterization(
    startX,
    startY,
    radiusX,
    radiusY,
    fA,
    fS,
    endX,
    endY,
    sinPhi,
    cosPhi
  );

  return splitArcIntoSegments(
    centerX,
    centerY,
    startAngle,
    deltaAngle,
    correctedRadiusX,
    correctedRadiusY,
    sinPhi,
    cosPhi
  );
}

function getCenterParameterization(
  startX: number,
  startY: number,
  radiusX: number,
  radiusY: number,
  largeArcFlag: number,
  sweepFlag: number,
  endX: number,
  endY: number,
  sinRotation: number,
  cosRotation: number
) {
  const xPrime =
    (cosRotation * (startX - endX)) / 2 + (sinRotation * (startY - endY)) / 2;
  const yPrime =
    (-sinRotation * (startX - endX)) / 2 + (cosRotation * (startY - endY)) / 2;

  const xPrimeSq = xPrime * xPrime;
  const yPrimeSq = yPrime * yPrime;

  let correctedRadiusX = radiusX;
  let correctedRadiusY = radiusY;
  const radCheck =
    xPrimeSq / (correctedRadiusX * correctedRadiusX) +
    yPrimeSq / (correctedRadiusY * correctedRadiusY);

  if (radCheck > 1) {
    const scale = Math.sqrt(radCheck);
    correctedRadiusX *= scale;
    correctedRadiusY *= scale;
  }

  const crxSq = correctedRadiusX * correctedRadiusX;
  const crySq = correctedRadiusY * correctedRadiusY;

  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const numerator = Math.max(
    0,
    crxSq * crySq - crxSq * yPrimeSq - crySq * xPrimeSq
  );
  const denominator = crxSq * yPrimeSq + crySq * xPrimeSq;
  const coef = sign * Math.sqrt(numerator / denominator);

  const cxp = coef * ((correctedRadiusX * yPrime) / correctedRadiusY);
  const cyp = coef * (-(correctedRadiusY * xPrime) / correctedRadiusX);

  const centerX = cosRotation * cxp - sinRotation * cyp + (startX + endX) / 2;
  const centerY = sinRotation * cxp + cosRotation * cyp + (startY + endY) / 2;

  const startVectorX = (xPrime - cxp) / correctedRadiusX;
  const startVectorY = (yPrime - cyp) / correctedRadiusY;
  const endVectorX = (-xPrime - cxp) / correctedRadiusX;
  const endVectorY = (-yPrime - cyp) / correctedRadiusY;

  const startAngle = calculateAngle(1, 0, startVectorX, startVectorY);
  let deltaAngle = calculateAngle(
    startVectorX,
    startVectorY,
    endVectorX,
    endVectorY
  );

  if (sweepFlag === 0 && deltaAngle > 0) deltaAngle -= 2 * Math.PI;
  if (sweepFlag === 1 && deltaAngle < 0) deltaAngle += 2 * Math.PI;

  return {
    centerX,
    centerY,
    startAngle,
    deltaAngle,
    correctedRadiusX,
    correctedRadiusY,
  };
}

function calculateAngle(
  uX: number,
  uY: number,
  vX: number,
  vY: number
): number {
  const dot = uX * vX + uY * vY;
  const mag = Math.sqrt(uX * uX + uY * uY) * Math.sqrt(vX * vX + vY * vY);
  const sign = uX * vY - uY * vX < 0 ? -1 : 1;
  return sign * Math.acos(Math.max(-1, Math.min(1, dot / mag)));
}

function splitArcIntoSegments(
  centerX: number,
  centerY: number,
  startAngle: number,
  deltaAngle: number,
  radiusX: number,
  radiusY: number,
  sinRotation: number,
  cosRotation: number
): number[][] {
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

    const transformToEllipse = (uX: number, uY: number) => [
      centerX + cosRotation * uX * radiusX - sinRotation * uY * radiusY,
      centerY + sinRotation * uX * radiusX + cosRotation * uY * radiusY,
    ];

    const [cp1x, cp1y] = transformToEllipse(unitX1, unitY1);
    const [cp2x, cp2y] = transformToEllipse(unitX2, unitY2);
    const [dstX, dstY] = transformToEllipse(cos2, sin2);

    cubics.push([cp1x, cp1y, cp2x, cp2y, dstX, dstY]);
  }

  return cubics;
}
