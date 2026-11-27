import { useEffect, useState } from 'react';

export function useStep(intervalMs: number) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setStep((value) => value + 1),
      intervalMs
    );
    return () => clearInterval(interval);
  }, [intervalMs]);

  return step;
}
