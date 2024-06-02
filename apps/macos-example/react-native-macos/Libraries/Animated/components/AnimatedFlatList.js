/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {AnimatedComponentType} from '../createAnimatedComponent';

import FlatList from '../../Lists/FlatList';
import createAnimatedComponent from '../createAnimatedComponent';
import * as React from 'react';

/**
 * @see https://github.com/facebook/react-native/commit/b8c8562
 */
const FlatListWithEventThrottle = React.forwardRef(
  // $FlowFixMe[incompatible-call]
  (
    props: React.ElementConfig<typeof FlatList>,
    ref:
      | ((null | FlatList<mixed>) => mixed)
      | {current: null | FlatList<mixed>, ...},
  ) => <FlatList {...props} ref={ref} />,
);

export default (createAnimatedComponent(
  FlatListWithEventThrottle,
): AnimatedComponentType<
  React.ElementConfig<typeof FlatList>,
  React.ElementRef<typeof FlatList>,
>);
