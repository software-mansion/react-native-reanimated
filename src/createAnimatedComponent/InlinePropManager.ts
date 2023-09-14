import type { StyleProps } from '../reanimated2';
import type { AnimatedComponentProps } from './utils';
import { flattenArray } from './utils';
import { makeViewDescriptorsSet } from '../reanimated2/ViewDescriptorsSet';
import type {
  ViewDescriptorsSet,
  ViewRefSet,
} from '../reanimated2/ViewDescriptorsSet';
import { adaptViewConfig } from '../ConfigHelper';
import updateProps from '../reanimated2/UpdateProps';
import { stopMapper, startMapper } from '../reanimated2/mappers';
import { isSharedValue } from '../reanimated2/utils';
import NativeReanimatedModule from '../reanimated2/NativeReanimated';

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
    if (styles1[key] !== styles2[key]) return true;
  }

  return false;
}

function getInlinePropsUpdate(inlineProps: Record<string, any>) {
  'worklet';
  const update: Record<string, any> = {};
  for (const [key, styleValue] of Object.entries(inlineProps)) {
    if (key === 'transform') {
      update[key] = styleValue.map((transform: Record<string, any>) => {
        return getInlinePropsUpdate(transform);
      });
    } else if (isSharedValue(styleValue)) {
      update[key] = styleValue.value;
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
        for (const [key, styleValue] of Object.entries(style)) {
          if (isSharedValue(styleValue)) {
            inlineProps[key] = styleValue;
          } else if (
            key === 'transform' &&
            isInlineStyleTransform(styleValue)
          ) {
            inlineProps[key] = styleValue;
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

export class InlinePropManager {
  _inlinePropsViewDescriptors: ViewDescriptorsSet | null = null;
  _inlinePropsMapperId: number | null = null;
  _inlineProps: StyleProps = {};

  public attachInlineProps(
    animatedComponent: React.Component<unknown, unknown>,
    viewInfo: any // viewTag, viewName, shadowNodeWrapper, viewConfig
  ) {
    const newInlineProps: Record<string, any> = extractSharedValuesMapFromProps(
      animatedComponent.props
    );
    const hasChanged = inlinePropsHasChanged(newInlineProps, this._inlineProps);

    if (hasChanged) {
      if (!this._inlinePropsViewDescriptors) {
        this._inlinePropsViewDescriptors = makeViewDescriptorsSet();

        const { viewTag, viewName, shadowNodeWrapper, viewConfig } = viewInfo;

        if (Object.keys(newInlineProps).length && viewConfig) {
          adaptViewConfig(viewConfig);
        }

        this._inlinePropsViewDescriptors.add({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          tag: viewTag as number,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          name: viewName!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          shadowNodeWrapper: shadowNodeWrapper!,
        });
      }
      const shareableViewDescriptors =
        this._inlinePropsViewDescriptors.shareableViewDescriptors;

      const maybeViewRef = NativeReanimatedModule.native
        ? undefined
        : ({ items: new Set([this]) } as ViewRefSet<any>); // see makeViewsRefSet

      const updaterFunction = () => {
        'worklet';
        const update = getInlinePropsUpdate(newInlineProps);
        updateProps(shareableViewDescriptors, update, maybeViewRef);
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
