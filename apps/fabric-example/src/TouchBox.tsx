import { useEffect, useMemo } from 'react';
import type { ViewProps as RNViewProps } from 'react-native';

import NativeTouchBox from '../specs/TouchBoxNativeComponent';
import {
  attachHandler,
  createController,
  type BoxState,
  type TouchEvent,
} from './touchHandler';

type TouchBoxProps = RNViewProps & {
  handler: (touch: TouchEvent, state?: BoxState) => BoxState;
};

export default function TouchBox({ handler, ...props }: TouchBoxProps) {
  const controller = useMemo(() => createController(), []);

  useEffect(() => {
    attachHandler(controller, handler);
  }, [controller, handler]);

  return <NativeTouchBox controllerId={controller.id} {...props} />;
}
