'use strict';

import type { HostComponent } from 'react-native';

// This is a workaround for Next.js, which resolves the non-native file
// during SSR — `codegenNativeComponent` cannot be called there, so we
// export a dummy host component instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default {} as HostComponent<any>;
