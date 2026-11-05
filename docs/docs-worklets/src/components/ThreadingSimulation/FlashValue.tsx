import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';

export default function FlashValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const previous = useRef(value);
  const [flashes, setFlashes] = useState(0);
  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      setFlashes((count) => count + 1);
    }
  }, [value]);
  return (
    <span
      key={flashes}
      className={clsx(className, flashes > 0 && styles.valueFlash)}>
      {value}
    </span>
  );
}
