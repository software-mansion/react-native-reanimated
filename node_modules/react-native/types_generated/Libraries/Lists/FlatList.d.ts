/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @generated SignedSource<<0b66bebedeaa000437d04f244238a5af>>
 *
 * This file was translated from Flow by scripts/build-types/index.js.
 * Original file: packages/react-native/Libraries/Lists/FlatList.js
 */

import type $$IMPORT_TYPEOF_1$$ from "../Components/ScrollView/ScrollViewNativeComponent";
type ScrollViewNativeComponent = typeof $$IMPORT_TYPEOF_1$$;
import type { ViewStyleProp } from "../StyleSheet/StyleSheet";
import type { ListRenderItem } from "@react-native/virtualized-lists";
import { type ScrollResponderType } from "../Components/ScrollView/ScrollView";
import View from "../Components/View/View";
import VirtualizedLists from "@react-native/virtualized-lists";
import * as React from "react";
declare const VirtualizedList: typeof VirtualizedLists.VirtualizedList;
type RequiredProps<ItemT> = {
  /**
   * An array (or array-like list) of items to render. Other data types can be
   * used by targeting VirtualizedList directly.
   */
  data: Readonly<ArrayLike<ItemT>> | undefined;
};
type OptionalProps<ItemT> = {
  /**
   * Takes an item from `data` and renders it into the list. Example usage:
   *
   *     <FlatList
   *       ItemSeparatorComponent={Platform.OS !== 'android' && ({highlighted}) => (
   *         <View style={[style.separator, highlighted && {marginLeft: 0}]} />
   *       )}
   *       data={[{title: 'Title Text', key: 'item1'}]}
   *       renderItem={({item, separators}) => (
   *         <TouchableHighlight
   *           onPress={() => this._onPress(item)}
   *           onShowUnderlay={separators.highlight}
   *           onHideUnderlay={separators.unhighlight}>
   *           <View style={{backgroundColor: 'white'}}>
   *             <Text>{item.title}</Text>
   *           </View>
   *         </TouchableHighlight>
   *       )}
   *     />
   *
   * Provides additional metadata like `index` if you need it, as well as a more generic
   * `separators.updateProps` function which let's you set whatever props you want to change the
   * rendering of either the leading separator or trailing separator in case the more common
   * `highlight` and `unhighlight` (which set the `highlighted: boolean` prop) are insufficient for
   * your use-case.
   */
  renderItem?: ListRenderItem<ItemT> | undefined;
  /**
   * Optional custom style for multi-item rows generated when numColumns > 1.
   */
  columnWrapperStyle?: ViewStyleProp;
  /**
   * A marker property for telling the list to re-render (since it implements `PureComponent`). If
   * any of your `renderItem`, Header, Footer, etc. functions depend on anything outside of the
   * `data` prop, stick it here and treat it immutably.
   */
  extraData?: any;
  /**
   * `getItemLayout` is an optional optimizations that let us skip measurement of dynamic content if
   * you know the height of items a priori. `getItemLayout` is the most efficient, and is easy to
   * use if you have fixed height items, for example:
   *
   *     getItemLayout={(data, index) => (
   *       {length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index}
   *     )}
   *
   * Adding `getItemLayout` can be a great performance boost for lists of several hundred items.
   * Remember to include separator length (height or width) in your offset calculation if you
   * specify `ItemSeparatorComponent`.
   */
  getItemLayout?: (data: Readonly<ArrayLike<ItemT>> | undefined, index: number) => {
    length: number;
    offset: number;
    index: number;
  };
  /**
   * If true, renders items next to each other horizontally instead of stacked vertically.
   */
  horizontal?: boolean | undefined;
  /**
   * How many items to render in the initial batch. This should be enough to fill the screen but not
   * much more. Note these items will never be unmounted as part of the windowed rendering in order
   * to improve perceived performance of scroll-to-top actions.
   */
  initialNumToRender?: number | undefined;
  /**
   * Instead of starting at the top with the first item, start at `initialScrollIndex`. This
   * disables the "scroll to top" optimization that keeps the first `initialNumToRender` items
   * always rendered and immediately renders the items starting at this initial index. Requires
   * `getItemLayout` to be implemented.
   */
  initialScrollIndex?: number | undefined;
  /**
   * Reverses the direction of scroll. Uses scale transforms of -1.
   */
  inverted?: boolean | undefined;
  /**
   * Used to extract a unique key for a given item at the specified index. Key is used for caching
   * and as the react key to track item re-ordering. The default extractor checks `item.key`, then
   * falls back to using the index, like React does.
   */
  keyExtractor?: ((item: ItemT, index: number) => string) | undefined;
  /**
   * Multiple columns can only be rendered with `horizontal={false}` and will zig-zag like a
   * `flexWrap` layout. Items should all be the same height - masonry layouts are not supported.
   *
   * The default value is 1.
   */
  numColumns?: number;
  /**
   * Note: may have bugs (missing content) in some circumstances - use at your own risk.
   *
   * This may improve scroll performance for large lists.
   *
   * The default value is true for Android.
   */
  removeClippedSubviews?: boolean;
  /**
   * See `ScrollView` for flow type and further documentation.
   */
  fadingEdgeLength?: number | undefined;
  /**
   * Enable an optimization to memoize the item renderer to prevent unnecessary rerenders.
   */
  strictMode?: boolean;
};
type FlatListBaseProps<ItemT> = Omit<RequiredProps<ItemT>, keyof OptionalProps<ItemT> | keyof {}> & Omit<OptionalProps<ItemT>, keyof {}> & {};
type VirtualizedListProps = React.JSX.LibraryManagedAttributes<typeof VirtualizedList, React.ComponentProps<typeof VirtualizedList>>;
export type FlatListProps<ItemT> = Omit<Omit<VirtualizedListProps, "data" | "getItem" | "getItemCount" | "getItemLayout" | "renderItem" | "keyExtractor">, keyof FlatListBaseProps<ItemT> | keyof {}> & Omit<FlatListBaseProps<ItemT>, keyof {}> & {};
/**
 * A performant interface for rendering simple, flat lists, supporting the most handy features:
 *
 *  - Fully cross-platform.
 *  - Optional horizontal mode.
 *  - Configurable viewability callbacks.
 *  - Header support.
 *  - Footer support.
 *  - Separator support.
 *  - Pull to Refresh.
 *  - Scroll loading.
 *  - ScrollToIndex support.
 *
 * If you need section support, use [`<SectionList>`](docs/sectionlist.html).
 *
 * Minimal Example:
 *
 *     <FlatList
 *       data={[{key: 'a'}, {key: 'b'}]}
 *       renderItem={({item}) => <Text>{item.key}</Text>}
 *     />
 *
 * More complex, multi-select example demonstrating `PureComponent` usage for perf optimization and avoiding bugs.
 *
 * - By binding the `onPressItem` handler, the props will remain `===` and `PureComponent` will
 *   prevent wasteful re-renders unless the actual `id`, `selected`, or `title` props change, even
 *   if the components rendered in `MyListItem` did not have such optimizations.
 * - By passing `extraData={this.state}` to `FlatList` we make sure `FlatList` itself will re-render
 *   when the `state.selected` changes. Without setting this prop, `FlatList` would not know it
 *   needs to re-render any items because it is also a `PureComponent` and the prop comparison will
 *   not show any changes.
 * - `keyExtractor` tells the list to use the `id`s for the react keys instead of the default `key` property.
 *
 *
 *     class MyListItem extends React.PureComponent {
 *       _onPress = () => {
 *         this.props.onPressItem(this.props.id);
 *       };
 *
 *       render() {
 *         const textColor = this.props.selected ? "red" : "black";
 *         return (
 *           <TouchableOpacity onPress={this._onPress}>
 *             <View>
 *               <Text style={{ color: textColor }}>
 *                 {this.props.title}
 *               </Text>
 *             </View>
 *           </TouchableOpacity>
 *         );
 *       }
 *     }
 *
 *     class MultiSelectList extends React.PureComponent {
 *       state = {selected: (new Map(): Map<string, boolean>)};
 *
 *       _keyExtractor = (item, index) => item.id;
 *
 *       _onPressItem = (id: string) => {
 *         // updater functions are preferred for transactional updates
 *         this.setState((state) => {
 *           // copy the map rather than modifying state.
 *           const selected = new Map(state.selected);
 *           selected.set(id, !selected.get(id)); // toggle
 *           return {selected};
 *         });
 *       };
 *
 *       _renderItem = ({item}) => (
 *         <MyListItem
 *           id={item.id}
 *           onPressItem={this._onPressItem}
 *           selected={!!this.state.selected.get(item.id)}
 *           title={item.title}
 *         />
 *       );
 *
 *       render() {
 *         return (
 *           <FlatList
 *             data={this.props.data}
 *             extraData={this.state}
 *             keyExtractor={this._keyExtractor}
 *             renderItem={this._renderItem}
 *           />
 *         );
 *       }
 *     }
 *
 * This is a convenience wrapper around [`<VirtualizedList>`](docs/virtualizedlist.html),
 * and thus inherits its props (as well as those of `ScrollView`) that aren't explicitly listed
 * here, along with the following caveats:
 *
 * - Internal state is not preserved when content scrolls out of the render window. Make sure all
 *   your data is captured in the item data or external stores like Flux, Redux, or Relay.
 * - This is a `PureComponent` which means that it will not re-render if `props` remain shallow-
 *   equal. Make sure that everything your `renderItem` function depends on is passed as a prop
 *   (e.g. `extraData`) that is not `===` after updates, otherwise your UI may not update on
 *   changes. This includes the `data` prop and parent component state.
 * - In order to constrain memory and enable smooth scrolling, content is rendered asynchronously
 *   offscreen. This means it's possible to scroll faster than the fill rate ands momentarily see
 *   blank content. This is a tradeoff that can be adjusted to suit the needs of each application,
 *   and we are working on improving it behind the scenes.
 * - By default, the list looks for a `key` prop on each item and uses that for the React key.
 *   Alternatively, you can provide a custom `keyExtractor` prop.
 *
 * Also inherits [ScrollView Props](docs/scrollview.html#props), unless it is nested in another FlatList of same orientation.
 */
declare class FlatList<ItemT = any> extends React.PureComponent<FlatListProps<ItemT>> {
  scrollToEnd(params?: null | undefined | {
    animated?: boolean | undefined;
  }): void;
  scrollToIndex(params: {
    animated?: boolean | undefined;
    index: number;
    viewOffset?: number;
    viewPosition?: number;
  }): void;
  scrollToItem(params: {
    animated?: boolean | undefined;
    item: ItemT;
    viewOffset?: number;
    viewPosition?: number;
  }): void;
  scrollToOffset(params: {
    animated?: boolean | undefined;
    offset: number;
  }): void;
  recordInteraction(): void;
  flashScrollIndicators(): void;
  getScrollResponder(): null | undefined | ScrollResponderType;
  getNativeScrollRef(): (null | undefined | React.ComponentRef<typeof View>) | (null | undefined | React.ComponentRef<ScrollViewNativeComponent>);
  getScrollableNode(): any;
  setNativeProps(props: {
    [$$Key$$: string]: unknown;
  }): void;
  constructor(props: FlatListProps<ItemT>);
  componentDidUpdate(prevProps: FlatListProps<ItemT>): void;
  render(): React.ReactNode;
}
export default FlatList;
