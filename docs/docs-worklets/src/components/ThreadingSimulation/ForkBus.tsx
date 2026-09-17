import React from 'react';
import clsx from 'clsx';

import styles from './styles.module.css';
import { runtimeClass } from './runtimeColors';
import type { RuntimeDescriptor } from './runtimeColors';

export interface BusSlot {
  index: number;
  runtime: RuntimeDescriptor | undefined;
  activeSince: number | undefined;
  lineImpulse: number | undefined;
}

interface ForkBusProps {
  slots: BusSlot[];
  showDown?: boolean;
  pulse?: boolean;
}

export default function ForkBus({
  slots,
  showDown = true,
  pulse = true,
}: ForkBusProps) {
  return (
    <div
      className={styles.forkBus}
      aria-hidden="true"
      data-help="One line per core. A pulse travels from the executing core up to its code line and down to the runtime it executes on.">
      {slots.map(({ index, runtime, activeSince, lineImpulse }) => {
        const isActive = activeSince !== undefined;
        const colorClass =
          runtime === undefined ? undefined : runtimeClass(runtime);
        const lineKey = isActive ? `${index}:${activeSince}` : `${index}`;
        const pulses =
          pulse &&
          isActive &&
          lineImpulse !== undefined &&
          lineImpulse > activeSince;
        const style = { '--slot': index } as React.CSSProperties;
        return (
          <React.Fragment key={lineKey}>
            <span
              className={clsx(
                styles.forkLine,
                styles.forkTrunk,
                colorClass,
                isActive && styles.forkLineActive,
                !pulse && styles.forkLineStatic
              )}
              style={style}>
              {pulses && (
                <span
                  key={lineImpulse}
                  className={clsx(styles.busPulse, styles.pulseTrunk)}
                />
              )}
            </span>
            <span
              className={clsx(
                styles.forkLine,
                styles.forkUp,
                colorClass,
                isActive && styles.forkLineActive,
                !pulse && styles.forkLineStatic
              )}
              style={style}>
              {pulses && (
                <span
                  key={lineImpulse}
                  className={clsx(styles.busPulse, styles.pulseUp)}
                />
              )}
            </span>
            {showDown && (
              <span
                className={clsx(
                  styles.forkLine,
                  styles.forkDown,
                  colorClass,
                  isActive && styles.forkLineActive,
                  !pulse && styles.forkLineStatic
                )}
                style={style}>
                {pulses && (
                  <span
                    key={lineImpulse}
                    className={clsx(styles.busPulse, styles.pulseDown)}
                  />
                )}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
