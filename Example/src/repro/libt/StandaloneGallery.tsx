import React from 'react';
import { Dimensions } from 'react-native';

import { GalleryItemType } from './types';

import { Pager, RenderPageProps, PagerProps } from './Pager';
import {
  ImageTransformer,
  ImageTransformerProps,
  RenderImageProps,
} from './ImageTransformer';

const dimensions = Dimensions.get('window');

interface Handlers<T> {
  onTap?: ImageTransformerProps['onTap'];
  onDoubleTap?: ImageTransformerProps['onDoubleTap'];
  onInteraction?: ImageTransformerProps['onInteraction'];
  onPagerTranslateChange?: (translateX: number) => void;
  onGesture?: PagerProps<T, any>['onGesture'];
  shouldPagerHandleGestureEvent?: PagerProps<
    T,
    any
  >['shouldHandleGestureEvent'];
}

export interface StandaloneGalleryHandler {
  goNext: () => void;
  goBack: () => void;
  setIndex: (nextIndex: number) => void;
}

export interface ImageRendererProps<T> extends Handlers<T> {
  item: RenderPageProps<T>['item'];
  pagerProps: RenderPageProps<T>;
  width: number;
  height: number;
  renderImage?: (
    props: RenderImageProps,
    index?: number,
  ) => JSX.Element;
}

type UnpackItemT<T> = T extends (infer ItemT)[]
  ? ItemT
  : T extends ReadonlyArray<infer ItemT>
  ? ItemT
  : T extends Map<any, infer ItemT>
  ? ItemT
  : T extends Set<infer ItemT>
  ? ItemT
  : T extends {
      [key: string]: infer ItemT;
    }
  ? ItemT
  : any;

export interface StandaloneGalleryProps<T, ItemT>
  extends Handlers<ItemT> {
  items: T;
  renderPage?: (
    props: ImageRendererProps<ItemT>,
    index: number,
  ) => JSX.Element;
  renderImage?: (
    props: RenderImageProps,
    item: ItemT,
    index: number,
  ) => JSX.Element;
  keyExtractor?: (item: ItemT, index: number) => string;
  initialIndex?: number;
  width?: number;
  height?: number;
  numToRender?: number;
  gutterWidth?: number;
  onIndexChange?: (nextIndex: number) => void;
  getItem?: (data: T, index: number) => ItemT | undefined;
  getTotalCount?: (data: T) => number;
}

function isImageItemType(type: any): type is GalleryItemType {
  return (
    typeof type === 'object' &&
    'width' in type &&
    'height' in type &&
    'uri' in type
  );
}

export function ImageRenderer<T = unknown>({
  item,
  pagerProps,
  width,
  height,
  onDoubleTap,
  onTap,
  onInteraction,
  renderImage,
}: ImageRendererProps<T>) {
  if (!isImageItemType(item)) {
    throw new Error(
      'ImageRenderer: item should have both width and height',
    );
  }

  return (
    <ImageTransformer
      outerGestureHandlerActive={pagerProps.isPagerInProgress}
      isActive={pagerProps.isPageActive}
      windowDimensions={{ width, height }}
      height={item.height}
      renderImage={renderImage}
      onStateChange={pagerProps.onPageStateChange}
      outerGestureHandlerRefs={pagerProps.pagerRefs}
      source={item.uri}
      width={item.width}
      onDoubleTap={onDoubleTap}
      onTap={onTap}
      onInteraction={onInteraction}
    />
  );
}

export class StandaloneGallery<
  T,
  ItemT = UnpackItemT<T>
> extends React.PureComponent<
  StandaloneGalleryProps<T, ItemT>,
  {
    localIndex: number;
  }
> {
  static ImageRenderer = React.memo(ImageRenderer);

  tempIndex: number = this.props.initialIndex ?? 0;

  constructor(props: StandaloneGalleryProps<T, ItemT>) {
    super(props);

    this._renderPage = this._renderPage.bind(this);
    this._keyExtractor = this._keyExtractor.bind(this);
  }

  state = {
    localIndex: this.props.initialIndex ?? 0,
  };

  get totalCount() {
    if (Array.isArray(this.props.items)) {
      return this.props.items.length;
    }

    if (typeof this.props.getTotalCount === 'function') {
      return this.props.getTotalCount(this.props.items);
    }

    throw new Error(
      'StandaloneGallery: either items should be an array or getTotalCount should be defined',
    );
  }

  private setLocalIndex(nextIndex: number) {
    this.setState({
      localIndex: nextIndex,
    });
  }

  private setTempIndex(nextIndex: number) {
    this.tempIndex = nextIndex;
  }

  setIndex(nextIndex: number) {
    this.setLocalIndex(nextIndex);
  }

  goNext() {
    const nextIndex = this.tempIndex + 1;
    if (nextIndex > this.totalCount - 1) {
      console.warn(
        'StandaloneGallery: Index cannot be bigger than pages count',
      );
      return;
    }

    this.setIndex(nextIndex);
  }

  goBack() {
    const nextIndex = this.tempIndex - 1;

    if (nextIndex < 0) {
      console.warn('StandaloneGallery: Index cannot be negative');
      return;
    }

    this.setIndex(nextIndex);
  }

  _keyExtractor(item: ItemT, index: number) {
    if (typeof this.props.keyExtractor === 'function') {
      return this.props.keyExtractor(item, index);
    }

    return index.toString();
  }

  _renderPage(pagerProps: RenderPageProps<ItemT>, index: number) {
    const {
      onDoubleTap,
      onTap,
      onInteraction,
      width = dimensions.width,
      height = dimensions.height,
      renderPage,
      renderImage,
    } = this.props;

    const props = {
      item: pagerProps.item,
      width,
      height,
      pagerProps,
      onDoubleTap,
      onTap,
      onInteraction,
      renderImage: renderImage
        ? (props: RenderImageProps) => {
            return renderImage(props, pagerProps.item, index);
          }
        : undefined,
    };

    if (typeof renderPage === 'function') {
      return renderPage(props, index);
    }

    return <ImageRenderer {...props} />;
  }

  render() {
    const {
      items,
      gutterWidth,
      onIndexChange,
      getItem,
      width = dimensions.width,
      onPagerTranslateChange,
      numToRender,
      onGesture,
      shouldPagerHandleGestureEvent,
    } = this.props;

    const setTempIndex = (index: number) => {
      this.setTempIndex(index);
    };

    function onIndexChangeWorklet(nextIndex: number) {
      'worklet';

      setTempIndex(nextIndex);

      if (onIndexChange) {
        onIndexChange(nextIndex);
      }
    }

    return (
      <Pager
        totalCount={this.totalCount}
        getItem={getItem}
        keyExtractor={this._keyExtractor}
        initialIndex={this.state.localIndex}
        pages={items}
        width={width}
        gutterWidth={gutterWidth}
        onIndexChange={onIndexChangeWorklet}
        onPagerTranslateChange={onPagerTranslateChange}
        shouldHandleGestureEvent={shouldPagerHandleGestureEvent}
        onGesture={onGesture}
        renderPage={this._renderPage}
        numToRender={numToRender}
      />
    );
  }
}
