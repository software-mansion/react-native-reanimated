'use strict';
import type { NativePropsBuilder, UnknownRecord } from '../../../common';
import { logger } from '../../../common';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import { NATIVE_PSEUDO_SELECTORS } from '../../constants';
import type {
  CSSTransitionProperties,
  ICSSPseudoStylesManager,
  NativePseudoSelectorKey,
} from '../../types';
import type { PseudoStylesBySelector } from '../../utils';
import { deepEqual } from '../../utils';
import { normalizeCSSTransitionProperties } from '../normalization';
import { registerPseudoStyle, unregisterPseudoStyle } from '../proxy';
import type {
  CSSPseudoStyleConfig,
  CSSTransitionConfig,
  NormalizedCSSTransitionConfig,
} from '../types';

export default class CSSPseudoStylesManager implements ICSSPseudoStylesManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;
  private readonly propsBuilder: NativePropsBuilder;

  private prevPseudoStylesBySelector: PseudoStylesBySelector | null = null;
  private prevTransitionProperties: CSSTransitionProperties | null = null;
  private isRegistered = false;

  constructor(
    shadowNodeWrapper: ShadowNodeWrapper,
    viewTag: number,
    propsBuilder: NativePropsBuilder
  ) {
    this.shadowNodeWrapper = shadowNodeWrapper;
    this.viewTag = viewTag;
    this.propsBuilder = propsBuilder;
  }

  update(
    pseudoStylesBySelector: PseudoStylesBySelector | null,
    transitionProperties: CSSTransitionProperties | null
  ): void {
    if (
      deepEqual(pseudoStylesBySelector, this.prevPseudoStylesBySelector) &&
      deepEqual(transitionProperties, this.prevTransitionProperties)
    ) {
      return;
    }
    this.prevPseudoStylesBySelector = pseudoStylesBySelector;
    this.prevTransitionProperties = transitionProperties;

    if (this.isRegistered) {
      this.detach();
    }

    if (!pseudoStylesBySelector) {
      return;
    }

    const normalizedTransition = transitionProperties
      ? normalizeCSSTransitionProperties(transitionProperties)
      : null;

    for (const [selector, { selectorStyle, defaultStyle }] of Object.entries(
      pseudoStylesBySelector
    )) {
      if (!NATIVE_PSEUDO_SELECTORS.has(selector as NativePseudoSelectorKey)) {
        if (__DEV__) {
          logger.warn(
            `Pseudo selector "${selector}" is not supported on native and will be ignored.`
          );
        }
        continue;
      }
      const config = this.buildPseudoStyleConfig(
        selector as NativePseudoSelectorKey,
        selectorStyle,
        defaultStyle,
        normalizedTransition
      );
      registerPseudoStyle(this.shadowNodeWrapper, config);
      this.isRegistered = true;
    }
  }

  unmountCleanup(): void {
    if (this.isRegistered) {
      this.detach();
    }
  }

  private detach() {
    unregisterPseudoStyle(this.viewTag);
    this.isRegistered = false;
  }

  private buildPseudoStyleConfig(
    selector: NativePseudoSelectorKey,
    selectorStyle: UnknownRecord,
    defaultStyle: UnknownRecord,
    normalizedTransition: NormalizedCSSTransitionConfig | null
  ): CSSPseudoStyleConfig {
    const builtSelectorStyle = this.propsBuilder.build(selectorStyle, {
      includeUnprocessed: true,
    });
    const builtDefaultStyle = this.propsBuilder.build(defaultStyle, {
      includeUnprocessed: true,
    });

    nullifyUndefinedValues(builtSelectorStyle);
    nullifyUndefinedValues(builtDefaultStyle);

    const transition: CSSTransitionConfig = {};
    const propsInTransition = new Set([
      ...Object.keys(builtSelectorStyle),
      ...Object.keys(builtDefaultStyle),
    ]);

    for (const prop of propsInTransition) {
      const settings = getPropertyTransitionSettings(
        prop,
        normalizedTransition
      );
      transition[prop] = {
        value: [builtDefaultStyle[prop], builtSelectorStyle[prop]],
        duration: settings?.duration ?? 0,
        delay: settings?.delay ?? 0,
        timingFunction: settings?.timingFunction ?? 'ease',
        allowDiscrete: settings?.allowDiscrete ?? false,
      };
    }

    return {
      selector,
      selectorStyle: builtSelectorStyle,
      defaultStyle: builtDefaultStyle,
      transition,
    };
  }
}

function nullifyUndefinedValues(style: UnknownRecord): void {
  for (const key in style) {
    if (style[key] === undefined) {
      style[key] = null;
    }
  }
}

function getPropertyTransitionSettings(
  prop: string,
  normalized: NormalizedCSSTransitionConfig | null
) {
  if (!normalized) {
    return null;
  }
  if (
    normalized.specificProperties &&
    !normalized.specificProperties.has(prop)
  ) {
    return null;
  }
  return normalized.settings[prop] ?? normalized.settings.all ?? null;
}
