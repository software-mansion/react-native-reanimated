/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<556dc98c96f9beefc553fafdfa0f4961>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/Switch/Switch.js
 */

import type { ColorValue } from "../../StyleSheet/StyleSheet";
import type { NativeSyntheticEvent } from "../../Types/CoreEventTypes";
import type { ViewProps } from "../View/ViewPropTypes";
import AndroidSwitchNativeComponent from "./AndroidSwitchNativeComponent";
import SwitchNativeComponent from "./SwitchNativeComponent";
import * as React from "react";
export type SwitchPropsIOS = {
  /**
   * Background color when the switch is turned on.
   *
   * @deprecated use trackColor instead
   */
  onTintColor?: ColorValue | undefined;
  /**
   * Color of the foreground switch grip.
   *
   * @deprecated use thumbColor instead
   */
  thumbTintColor?: ColorValue | undefined;
  /**
   * Background color when the switch is turned off.
   *
   * @deprecated use trackColor instead
   */
  tintColor?: ColorValue | undefined;
};
type SwitchChangeEventData = Readonly<{
  target: number;
  value: boolean;
}>;
export type SwitchChangeEvent = NativeSyntheticEvent<SwitchChangeEventData>;
type SwitchPropsBase = {
  /**
    If true the user won't be able to toggle the switch.
     @default false
   */
  disabled?: boolean | undefined;
  /**
      The value of the switch. If true the switch will be turned on.
       @default false
     */
  value?: boolean | undefined;
  /**
      Color of the foreground switch grip. If this is set on iOS, the switch grip will lose its drop shadow.
     */
  thumbColor?: ColorValue | undefined;
  /**
      Custom colors for the switch track.
       _iOS_: When the switch value is false, the track shrinks into the border. If you want to change the
      color of the background exposed by the shrunken track, use
       [`ios_backgroundColor`](https://reactnative.dev/docs/switch#ios_backgroundColor).
     */
  trackColor?: Readonly<{
    false?: ColorValue | undefined;
    true?: ColorValue | undefined;
  }> | undefined;
  /**
      On iOS, custom color for the background. This background color can be
      seen either when the switch value is false or when the switch is
      disabled (and the switch is translucent).
     */
  ios_backgroundColor?: ColorValue | undefined;
  /**
      Invoked when the user tries to change the value of the switch. Receives
      the change event as an argument. If you want to only receive the new
      value, use `onValueChange` instead.
     */
  onChange?: ((event: SwitchChangeEvent) => Promise<void> | void) | undefined;
  /**
      Invoked when the user tries to change the value of the switch. Receives
      the new value as an argument. If you want to instead receive an event,
      use `onChange`.
     */
  onValueChange?: ((value: boolean) => Promise<void> | void) | undefined;
};
export type SwitchProps = Readonly<Omit<ViewProps, keyof SwitchPropsIOS | keyof SwitchPropsBase | keyof {}> & Omit<SwitchPropsIOS, keyof SwitchPropsBase | keyof {}> & Omit<SwitchPropsBase, keyof {}> & {}>;
type SwitchRef = React.ComponentRef<typeof SwitchNativeComponent | typeof AndroidSwitchNativeComponent>;
declare const Switch: (props: Omit<SwitchProps, keyof {
  ref?: React.Ref<SwitchRef>;
}> & {
  ref?: React.Ref<SwitchRef>;
}) => React.ReactNode;
/**
  Renders a boolean input.

  This is a controlled component that requires an `onValueChange`
  callback that updates the `value` prop in order for the component to
  reflect user actions. If the `value` prop is not updated, the
  component will continue to render the supplied `value` prop instead of
  the expected result of any user actions.

  ```SnackPlayer name=Switch
  import React, { useState } from "react";
  import { View, Switch, StyleSheet } from "react-native";

  const App = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = () => setIsEnabled(previousState => !previousState);

    return (
      <View style={styles.container}>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isEnabled ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center"
    }
  });

  export default App;
  ```
 */
declare const $$Switch: typeof Switch;
declare type $$Switch = typeof $$Switch;
export default $$Switch;
