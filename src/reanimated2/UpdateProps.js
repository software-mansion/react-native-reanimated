import { _updatePropsJS } from './js-reanimated/index';
import {
  updatePropsProcessColors,
  getUpdateProps,
} from './platform-specific/PlatformSpecific';

export default function updateProps(
  viewDescriptor,
  updates,
  maybeViewRef,
  adapters
) {
  'worklet';

  const viewName = viewDescriptor.value.name || 'RCTView';

  if (adapters) {
    adapters.forEach((adapter) => {
      adapter(updates);
    });
  }

  updatePropsProcessColors(updates);

  getUpdateProps()(
    viewDescriptor.value.tag,
    viewName,
    updates,
    maybeViewRef
  );
}
