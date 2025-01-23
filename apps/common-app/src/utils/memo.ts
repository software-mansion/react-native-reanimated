import type { FunctionComponent } from 'react';
import { memo } from 'react';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const typedMemo = <T extends FunctionComponent<any>>(Component: T) =>
  memo(Component) as unknown as T;
