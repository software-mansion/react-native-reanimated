type KeywordConversions = Record<string, `${number}%` | number>;

type TransformOrigin = Array<number | string> | string;

type NormalizedTransformOrigin = [
  `${number}%` | number,
  `${number}%` | number,
  number,
];

const HORIZONTAL_CONVERSIONS: KeywordConversions = {
  center: '50%',
  left: 0,
  right: '100%',
} satisfies KeywordConversions;

const VERTICAL_CONVERSIONS = {
  bottom: '100%',
  center: '50%',
  top: 0,
} satisfies KeywordConversions;

export const normalizeTransformOrigin = (
  transformOrigin: TransformOrigin
): NormalizedTransformOrigin => {
  const components = Array.isArray(transformOrigin)
    ? transformOrigin
    : transformOrigin.split(/\s+/);

  if (components.length < 1 || components.length > 3) {
    throw new Error(
      `Invalid transformOrigin: ${JSON.stringify(transformOrigin)}. Expected 1-3 values.`
    );
  }

  // Swap x and y components if they are in the wrong order
  if (
    components[0] in VERTICAL_CONVERSIONS &&
    (components[1] === undefined || components[1] in HORIZONTAL_CONVERSIONS)
  ) {
    [components[0], components[1]] = [components[1], components[0]];
  }

  const result = [
    normalizeComponent(components[0] ?? '50%', HORIZONTAL_CONVERSIONS),
    normalizeComponent(components[1] ?? '50%', VERTICAL_CONVERSIONS),
    normalizeComponent(components[2] ?? 0),
  ];

  const validatedResult = validateResult(result);

  if (!validatedResult) {
    throw new Error(
      `Invalid transformOrigin: ${JSON.stringify(transformOrigin)}. Expected 1-3 values.`
    );
  }

  return validatedResult;
};

const normalizeComponent = (
  component: number | string,
  keywords?: KeywordConversions
): `${number}%` | null | number => {
  if (keywords && component in keywords) {
    return keywords[component];
  } else if (typeof component === 'number') {
    return component;
  }

  const num = parseFloat(component);
  if (!isNaN(num)) {
    if (component.endsWith('%') && num !== 0) {
      return `${num}%`;
    }
    return num;
  }

  return null;
};

const validateResult = (
  result: Array<`${number}%` | null | number>
): NormalizedTransformOrigin | null => {
  const nullIdx = result.indexOf(null);

  if (
    nullIdx !== -1 ||
    (result[2] !== undefined && typeof result[2] !== 'number')
  ) {
    return null;
  }

  return result as NormalizedTransformOrigin;
};
