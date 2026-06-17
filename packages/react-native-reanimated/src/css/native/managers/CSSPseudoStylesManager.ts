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
import { registerPseudoStyles, unregisterPseudoStyles } from '../proxy';
import type {
  CSSPseudoStyleEntry,
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

    const mergedDefaultStyle: UnknownRecord = {};
    for (const [selector, { defaultStyle }] of Object.entries(
      pseudoStylesBySelector
    )) {
      if (NATIVE_PSEUDO_SELECTORS.has(selector as NativePseudoSelectorKey)) {
        Object.assign(mergedDefaultStyle, defaultStyle);
      }
    }
    const builtDefaultStyle = this.propsBuilder.build(mergedDefaultStyle, {
      includeUnprocessed: true,
    });
    nullifyUndefinedValues(builtDefaultStyle);

    const selectors: CSSPseudoStyleEntry[] = [];
    for (const [selector, { selectorStyle }] of Object.entries(
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
      selectors.push(
        this.buildPseudoStyleEntry(
          selector as NativePseudoSelectorKey,
          selectorStyle,
          builtDefaultStyle,
          normalizedTransition
        )
      );
    }

    if (selectors.length > 0) {
      registerPseudoStyles(this.shadowNodeWrapper, {
        defaultStyle: builtDefaultStyle,
        selectors,
      });
      this.isRegistered = true;
    }
  }

  unmountCleanup(): void {
    if (this.isRegistered) {
      this.detach();
    }
  }

  private detach() {
    unregisterPseudoStyles(this.viewTag);
    this.isRegistered = false;
  }

  private buildPseudoStyleEntry(
    selector: NativePseudoSelectorKey,
    selectorStyle: UnknownRecord,
    mergedDefaultStyle: UnknownRecord,
    normalizedTransition: NormalizedCSSTransitionConfig | null
  ): CSSPseudoStyleEntry {
    const builtSelectorStyle = this.propsBuilder.build(selectorStyle, {
      includeUnprocessed: true,
    });

    nullifyUndefinedValues(builtSelectorStyle);

    const transition: CSSTransitionConfig = {};
    for (const prop of Object.keys(builtSelectorStyle)) {
      const settings = getPropertyTransitionSettings(
        prop,
        normalizedTransition
      );
      transition[prop] = {
        value: [mergedDefaultStyle[prop], builtSelectorStyle[prop]],
        duration: settings?.duration ?? 0,
        delay: settings?.delay ?? 0,
        timingFunction: settings?.timingFunction ?? 'ease',
        allowDiscrete: settings?.allowDiscrete ?? false,
      };
    }

    return {
      selector,
      selectorStyle: builtSelectorStyle,
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
