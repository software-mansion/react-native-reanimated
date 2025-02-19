import { useEffect, useRef, useState } from 'react';

export default function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    clearTimeout(debounceTimeoutRef.current as unknown as number | undefined);
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
  }, [value, delay]);

  return debouncedValue;
}
