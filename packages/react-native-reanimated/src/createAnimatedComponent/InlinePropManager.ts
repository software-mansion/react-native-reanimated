'use strict';
import type { StyleProps } from '../commonTypes';
import { isSharedValue } from '../isSharedValue';
import { startMapper, stopMapper } from '../mappers';
import { updateProps } from '../updateProps';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
import { makeViewDescriptorsSet } from '../ViewDescriptorsSet';
import type {
  AnimatedComponentProps,
  AnimatedComponentTypeInternal,
  IInlinePropManager,
  ViewInfo,
} from './commonTypes';
import { flattenArray } from './utils';

function isInlineStyleTransform(transform: unknown): boolean {
  if (!Array.isArray(transform)) {
    return false;
  }

  return transform.some((t: Record<string, unknown>) => hasInlineStyles(t));
}

function inlinePropsHasChanged(
  styles1: StyleProps,
  styles2: StyleProps
): boolean {
  if (Object.keys(styles1).length !== Object.keys(styles2).length) {
    return true;
  }

  for (const key of Object.keys(styles1)) {
    if (styles1[key] !== styles2[key]) {
      return true;
    }
  }

  return false;
}

function getInlinePropsUpdate(styleValue: StyleProps): unknown {
  'worklet';
  if (isSharedValue(styleValue)) {
    return styleValue.value;
  }
  if (Array.isArray(styleValue)) {
    return styleValue.map(getInlinePropsUpdate);
  }
  if (styleValue && typeof styleValue === 'object') {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(styleValue)) {
      update[key] = getInlinePropsUpdate(value);
    }
    return update;
  }
  return styleValue;
}

function extractSharedValuesMapFromProps(
  props: AnimatedComponentProps<
    Record<string, unknown> /* Initial component props */
  >
): {
  inlineStyleProps: Record<string, unknown>;
  inlineTopLevelProps: Record<string, unknown>;
} {
  const inlineStyleProps: Record<string, unknown> = {};
  const inlineTopLevelProps: Record<string, unknown> = {};

  for (const key in props) {
    const value = props[key];
    if (key === 'style') {
      const styles = flattenArray<StyleProps>(props.style ?? []);
      styles.forEach((style) => {
        if (!style) {
          return;
        }
        if (__DEV__ && '_requiresAnimatedComponent' in style) {
          return;
        }
        for (const [styleKey, styleValue] of Object.entries(style)) {
          if (isSharedValue(styleValue)) {
            inlineStyleProps[styleKey] = styleValue;
          } else if (
            styleKey === 'transform' &&
            isInlineStyleTransform(styleValue)
          ) {
            inlineStyleProps[styleKey] = styleValue;
          }
        }
      });
    } else if (isSharedValue(value)) {
      inlineTopLevelProps[key] = value;
    }
  }

  return { inlineStyleProps, inlineTopLevelProps };
}

export function hasInlineStyles(style: StyleProps): boolean {
  if (!style) {
    return false;
  }
  return Object.keys(style).some((key) => {
    const styleValue = style[key];
    return (
      isSharedValue(styleValue) ||
      (key === 'transform' && isInlineStyleTransform(styleValue))
    );
  });
}

export function getInlineStyle(
  style: Record<string, unknown>,
  isFirstRender: boolean
) {
  if (isFirstRender) {
    return getInlinePropsUpdate(style) as Record<string, unknown>;
  }
  const newStyle: StyleProps = {};
  for (const [key, styleValue] of Object.entries(style)) {
    if (
      !isSharedValue(styleValue) &&
      !(key === 'transform' && isInlineStyleTransform(styleValue))
    ) {
      newStyle[key] = styleValue;
    }
  }
  return newStyle;
}

export class InlinePropManager implements IInlinePropManager {
  _inlinePropsViewDescriptors: ViewDescriptorsSet | null = null;
  _inlinePropsMapperId: number | null = null;
  _inlineProps: StyleProps = {};

  public attachInlineProps(
    animatedComponent: AnimatedComponentTypeInternal,
    viewInfo: ViewInfo
  ) {
    const { inlineStyleProps, inlineTopLevelProps } =
      extractSharedValuesMapFromProps(animatedComponent.props);
    const newInlineProps: Record<string, unknown> = {
      ...inlineStyleProps,
      ...inlineTopLevelProps,
    };
    const hasChanged = inlinePropsHasChanged(newInlineProps, this._inlineProps);

    if (hasChanged) {
      if (!this._inlinePropsViewDescriptors) {
        this._inlinePropsViewDescriptors = makeViewDescriptorsSet();

        const { viewTag, shadowNodeWrapper } = viewInfo;

        this._inlinePropsViewDescriptors.add({
          tag: viewTag as number,
          shadowNodeWrapper: shadowNodeWrapper!,
        });
      }
      const shareableViewDescriptors =
        this._inlinePropsViewDescriptors.shareableViewDescriptors;

      const hasInlineStyleProps = Object.keys(inlineStyleProps).length > 0;
      const hasInlineTopLevelProps =
        Object.keys(inlineTopLevelProps).length > 0;
      const updaterFunction = () => {
        'worklet';
        if (hasInlineStyleProps) {
          updateProps(
            shareableViewDescriptors,
            getInlinePropsUpdate(inlineStyleProps) as StyleProps
          );
        }
        if (hasInlineTopLevelProps) {
          // Shared values passed directly as top-level props are animated
          // props, not styles — process them like `useAnimatedProps` updates
          // (in particular, don't run them through the style props builder,
          // which drops non-style keys).
          updateProps(
            shareableViewDescriptors,
            getInlinePropsUpdate(inlineTopLevelProps) as StyleProps,
            true
          );
        }
      };
      this._inlineProps = newInlineProps;
      if (this._inlinePropsMapperId) {
        stopMapper(this._inlinePropsMapperId);
      }
      this._inlinePropsMapperId = null;
      if (Object.keys(newInlineProps).length) {
        this._inlinePropsMapperId = startMapper(
          updaterFunction,
          Object.values(newInlineProps)
        );
      }
    }
  }

  public detachInlineProps() {
    if (this._inlinePropsMapperId) {
      stopMapper(this._inlinePropsMapperId);
      this._inlinePropsMapperId = null;
    }
    this._inlinePropsViewDescriptors = null;
    this._inlineProps = {};
  }
}
