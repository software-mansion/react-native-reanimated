import type { ValueProcessor } from '../../types';
import { processColor } from '../colors';

type ColorStop = {
  color: number | string;
  position: number | string | null;
};

export type LinearGradientBackgroundImage = {
  type: 'linear-gradient';
  direction: { type: 'angle'; value: number };
  colorStops: ColorStop[];
};

const parseAngle = (angle: string): number | null => {
  // Unit conversion factors (to radians)
  const unitFactors: Record<string, number> = {
    rad: 1,
    deg: Math.PI / 180,
  };

  // Find position of the first non-numeric character (first character of the unit)
  const pos = angle.search(/[^0-9.+-]/);

  if (pos === -1) {
    return null;
  }

  const numericPart = angle.substring(0, pos);
  const unitPart = angle.substring(pos);

  // Validate numeric part
  if (!/^[-+]?\d*\.?\d+$/.test(numericPart)) {
    return null;
  }

  // Lookup the unit and convert to radians
  const factor = unitFactors[unitPart];
  if (factor === undefined) {
    return null;
  }

  const numericValue = parseFloat(numericPart);
  return numericValue * factor;
};

const parseDirection = (direction: string): number | null => {
  if (direction.startsWith('to ')) {
    switch (direction.split(/\s+/)[1]) {
      case 'top':
        return 0;
      case 'bottom':
        return 180;
      case 'left':
        return 270;
      case 'right':
        return 90;
      default:
        return null;
    }
  }

  return parseAngle(direction);
};

export const processLinearGradient: ValueProcessor<
  string[],
  LinearGradientBackgroundImage
> = (params) => {
  if (!params.length) {
    return undefined;
  }

  const direction = parseDirection(params[0]);
  const stops: ColorStop[] = [];

  for (let i = 1; i < params.length; i++) {
    const param = params[i];
    const color = processColor(param);
    const position = parsePosition(param);
    stops.push({ color, position });
  }

  // TODO: Parse color stops from remaining params
  const colorStops: LinearGradientBackgroundImage['colorStops'] = [];

  return {
    type: 'linear-gradient',
    direction: { type: 'angle', value: direction ?? 0 },
    colorStops,
  };
};
