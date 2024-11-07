/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FunctionComponent } from 'react';
import { memo } from 'react';

export const typedMemo = <T extends FunctionComponent<any>>(Component: T) =>
  memo(Component) as unknown as T;
