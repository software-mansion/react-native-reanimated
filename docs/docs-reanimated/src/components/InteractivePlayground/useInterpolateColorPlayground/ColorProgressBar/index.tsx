import React from 'react';
import styles from './styles.module.css';

const ColorProgressBar = ({
  color1,
  color2,
  interpolateFunction,
}: {
  color1: string;
  color2: string;
  interpolateFunction: (c1: string, c2: string, p: number) => string;
}) => {
  return (
    <div className={styles.row}>
      {new Array(11)
        .fill(null)
        .map((_, i) => i / 10)
        .map((p) => (
          <div
            key={'' + p}
            className={styles.smallBox}
            style={{
              backgroundColor: interpolateFunction(color1, color2, p),
            }}
          />
        ))}
    </div>
  );
};

export default ColorProgressBar;
