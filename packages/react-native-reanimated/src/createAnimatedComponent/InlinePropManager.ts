'use strict';
import type { StyleProps } from '../commonTypes';
import { isSharedValue } from '../isSharedValue';
import { startMapper, stopMapper } from '../mappers';
import { updateProps } from '../updateProps';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
import { makeViewDescriptorsSet } from '../ViewDescriptorsSet';
import type {
  AnimatedComponentProps,
  AnimatedComponentType,
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

function getInlinePropsUpdate(inlineProps: Record<string, unknown>) {
  'worklet';
  const update: Record<string, unknown> = {};
  for (const [key, styleValue] of Object.entries(inlineProps)) {
    if (isSharedValue(styleValue)) {
      update[key] = styleValue.value;
    } else if (Array.isArray(styleValue)) {
      update[key] = styleValue.map((item) => {
        return getInlinePropsUpdate(item);
      });
    } else if (typeof styleValue === 'object') {
      update[key] = getInlinePropsUpdate(styleValue as Record<string, unknown>);
    } else {
      update[key] = styleValue;
    }
  }
  return update;
}

function extractSharedValuesMapFromProps(
  props: AnimatedComponentProps<
    Record<string, unknown> /* Initial component props */
  >
): Record<string, unknown> {
  const inlineProps: Record<string, unknown> = {};

  for (const key in props) {
    const value = props[key];
    if (key === 'style') {
      const styles = flattenArray<StyleProps>(props.style ?? []);
      styles.forEach((style) => {
        if (!style) {
          return;
        }
        for (const [styleKey, styleValue] of Object.entries(style)) {
          if (isSharedValue(styleValue)) {
            inlineProps[styleKey] = styleValue;
          } else if (
            styleKey === 'transform' &&
            isInlineStyleTransform(styleValue)
          ) {
            inlineProps[styleKey] = styleValue;
          }
        }
      });
    } else if (isSharedValue(value)) {
      inlineProps[key] = value;
    }
  }

  return inlineProps;
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
    return getInlinePropsUpdate(style);
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
    animatedComponent: AnimatedComponentType,
    viewInfo: ViewInfo
  ) {
    const newInlineProps: Record<string, unknown> =
      extractSharedValuesMapFromProps(animatedComponent.props);
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

      const updaterFunction = () => {
        'worklet';
        const update = getInlinePropsUpdate(newInlineProps);
        updateProps(shareableViewDescriptors, update);
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
    }
  }
}
