import React, { useMemo, useState } from 'react';
import Example from './Example';

import { Range } from '..';

const HINGE_STATUS = {
  CLOSED: 1,
  PARTIALLY_OPEN: 2,
  FULLY_OPEN: 3,
} as const;

const FLAT_DEGREES = 180;

function getHingeStatus(degrees: number) {
  if (degrees <= 0) {
    return 'CLOSED';
  }
  if (degrees >= FLAT_DEGREES) {
    return 'FULLY_OPEN';
  }
  return 'PARTIALLY_OPEN';
}

function formatHingeCode(degrees: number) {
  const status = getHingeStatus(degrees);
  const angle = (degrees * Math.PI) / 180;

  return `
  {
    "angle": ${angle.toFixed(4)}, // ${degrees}°
    "status": ${HINGE_STATUS[status]}, // HingeStatus.${status}
    "interfaceOrientation": 0
  }
  `;
}

const initialState = {
  degrees: 90,
};

export default function useAnimatedHingePlayground() {
  const [degrees, setDegrees] = useState(initialState.degrees);

  const resetOptions = () => {
    setDegrees(initialState.degrees);
  };

  const controls = (
    <Range
      label="Hinge angle"
      min={0}
      max={FLAT_DEGREES}
      step={1}
      value={degrees}
      onChange={setDegrees}
    />
  );

  const code = useMemo(() => formatHingeCode(degrees), [degrees]);

  return {
    code,
    controls,
    example: Example,
    props: { degrees },
    resetOptions,
  };
}
