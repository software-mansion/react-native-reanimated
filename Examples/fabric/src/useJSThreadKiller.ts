import React from 'react';

export function useJSThreadKiller(
  iterations: number = 100000000,
  delay: number = 100
) {
  React.useEffect(() => {
    const interval = setInterval(() => {
      for (let i = 0; i < iterations; ++i) {}
    }, delay);
    return () => clearInterval(interval);
  }, [iterations, delay]);
}
