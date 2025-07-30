/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<1216068fb35a395c9e510d50ba157698>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/ActivityIndicator/ActivityIndicator.js
 */

import type { HostComponent } from "../../../src/private/types/HostComponent";
import type { ViewProps } from "../View/ViewPropTypes";
import { type ColorValue } from "../../StyleSheet/StyleSheet";
import * as React from "react";
type IndicatorSize = number | "small" | "large";
type ActivityIndicatorIOSProps = Readonly<{
  /**
    Whether the indicator should hide when not animating.
     @platform ios
  */
  hidesWhenStopped?: boolean | undefined;
}>;
export type ActivityIndicatorProps = Readonly<Omit<ViewProps, keyof ActivityIndicatorIOSProps | keyof {
  /**
  Whether to show the indicator (`true`) or hide it (`false`).
  */
  animating?: boolean | undefined;
  /**
  The foreground color of the spinner.
  @default {@platform android} `null` (system accent default color)
  @default {@platform ios} '#999999'
  */
  color?: ColorValue | undefined;
  /**
  Size of the indicator.
  @type enum(`'small'`, `'large'`)
  @type {@platform android} number
  */
  size?: IndicatorSize | undefined;
}> & Omit<ActivityIndicatorIOSProps, keyof {
  /**
  Whether to show the indicator (`true`) or hide it (`false`).
  */
  animating?: boolean | undefined;
  /**
  The foreground color of the spinner.
  @default {@platform android} `null` (system accent default color)
  @default {@platform ios} '#999999'
  */
  color?: ColorValue | undefined;
  /**
  Size of the indicator.
  @type enum(`'small'`, `'large'`)
  @type {@platform android} number
  */
  size?: IndicatorSize | undefined;
}> & {
  /**
  Whether to show the indicator (`true`) or hide it (`false`).
  */
  animating?: boolean | undefined;
  /**
  The foreground color of the spinner.
  @default {@platform android} `null` (system accent default color)
  @default {@platform ios} '#999999'
  */
  color?: ColorValue | undefined;
  /**
  Size of the indicator.
  @type enum(`'small'`, `'large'`)
  @type {@platform android} number
  */
  size?: IndicatorSize | undefined;
}>;
declare const ActivityIndicatorWithRef: (props: Omit<ActivityIndicatorProps, keyof {
  ref?: React.Ref<HostComponent<never>>;
}> & {
  ref?: React.Ref<HostComponent<never>>;
}) => React.ReactNode;
/**
  Displays a circular loading indicator.

  ```SnackPlayer name=ActivityIndicator%20Example
  import React from 'react';
  import {ActivityIndicator, StyleSheet, View} from 'react-native';

  const App = () => (
    <View style={[styles.container, styles.horizontal]}>
      <ActivityIndicator />
      <ActivityIndicator size="large" />
      <ActivityIndicator size="small" color="#0000ff" />
      <ActivityIndicator size="large" color="#00ff00" />
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
    },
    horizontal: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 10,
    },
  });

  export default App;
```
*/
declare const $$ActivityIndicator: typeof ActivityIndicatorWithRef;
declare type $$ActivityIndicator = typeof $$ActivityIndicator;
export default $$ActivityIndicator;
