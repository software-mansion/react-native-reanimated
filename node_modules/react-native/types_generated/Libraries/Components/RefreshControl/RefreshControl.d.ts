/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<c82b778e2b41218ede6dda510741934a>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Components/RefreshControl/RefreshControl.js
 */

import type { ColorValue } from "../../StyleSheet/StyleSheet";
import type { ViewProps } from "../View/ViewPropTypes";
import * as React from "react";
export type RefreshControlPropsIOS = Readonly<{
  /**
   * The color of the refresh indicator.
   */
  tintColor?: ColorValue | undefined;
  /**
   * Title color.
   */
  titleColor?: ColorValue | undefined;
  /**
   * The title displayed under the refresh indicator.
   */
  title?: string | undefined;
}>;
export type RefreshControlPropsAndroid = Readonly<{
  /**
   * Whether the pull to refresh functionality is enabled.
   */
  enabled?: boolean | undefined;
  /**
   * The colors (at least one) that will be used to draw the refresh indicator.
   */
  colors?: ReadonlyArray<ColorValue> | undefined;
  /**
   * The background color of the refresh indicator.
   */
  progressBackgroundColor?: ColorValue | undefined;
  /**
   * Size of the refresh indicator.
   */
  size?: ("default" | "large") | undefined;
}>;
type RefreshControlBaseProps = Readonly<{
  /**
   * Called when the view starts refreshing.
   */
  onRefresh?: (() => void | Promise<void>) | undefined;
  /**
   * Whether the view should be indicating an active refresh.
   */
  refreshing: boolean;
  /**
   * Progress view top offset
   */
  progressViewOffset?: number | undefined;
}>;
export type RefreshControlProps = Readonly<Omit<ViewProps, keyof RefreshControlPropsIOS | keyof RefreshControlPropsAndroid | keyof RefreshControlBaseProps | keyof {}> & Omit<RefreshControlPropsIOS, keyof RefreshControlPropsAndroid | keyof RefreshControlBaseProps | keyof {}> & Omit<RefreshControlPropsAndroid, keyof RefreshControlBaseProps | keyof {}> & Omit<RefreshControlBaseProps, keyof {}> & {}>;
/**
 * This component is used inside a ScrollView or ListView to add pull to refresh
 * functionality. When the ScrollView is at `scrollY: 0`, swiping down
 * triggers an `onRefresh` event.
 *
 * ### Usage example
 *
 * ``` js
 * class RefreshableList extends Component {
 *   constructor(props) {
 *     super(props);
 *     this.state = {
 *       refreshing: false,
 *     };
 *   }
 *
 *   _onRefresh() {
 *     this.setState({refreshing: true});
 *     fetchData().then(() => {
 *       this.setState({refreshing: false});
 *     });
 *   }
 *
 *   render() {
 *     return (
 *       <ListView
 *         refreshControl={
 *           <RefreshControl
 *             refreshing={this.state.refreshing}
 *             onRefresh={this._onRefresh.bind(this)}
 *           />
 *         }
 *         ...
 *       >
 *       ...
 *       </ListView>
 *     );
 *   }
 *   ...
 * }
 * ```
 *
 * __Note:__ `refreshing` is a controlled prop, this is why it needs to be set to true
 * in the `onRefresh` function otherwise the refresh indicator will stop immediately.
 */
declare class RefreshControl extends React.Component<RefreshControlProps> {
  componentDidMount(): void;
  componentDidUpdate(prevProps: RefreshControlProps): void;
  render(): React.ReactNode;
}
export default RefreshControl;
