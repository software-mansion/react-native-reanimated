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
  PseudoStyleInput,
  PseudoStylesInput,
} from '../types';
import { validatePseudoStyles } from './validatePseudoStyles';

export default class CSSPseudoStylesManager implements ICSSPseudoStylesManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;
  private readonly propsBuilder: NativePropsBuilder;
  private readonly componentName: string;

  private prevSource: PseudoStylesBySelector | PseudoStylesInput | null = null;
  private prevTransitionProperties: CSSTransitionProperties | null = null;
  private isRegistered = false;

  constructor(
    shadowNodeWrapper: ShadowNodeWrapper,
    viewTag: number,
    propsBuilder: NativePropsBuilder,
    componentName: string
  ) {
    this.shadowNodeWrapper = shadowNodeWrapper;
    this.viewTag = viewTag;
    this.propsBuilder = propsBuilder;
    this.componentName = componentName;
  }

  update(
    pseudoStylesBySelector: PseudoStylesBySelector | null,
    transitionProperties: CSSTransitionProperties | null
  ): void {
    if (this.isUnchanged(pseudoStylesBySelector, transitionProperties)) {
      return;
    }
    this.register(
      pseudoStylesBySelector &&
        pseudoStylesInputFromSelectors(pseudoStylesBySelector),
      transitionProperties
    );
  }

  updateInput(
    input: PseudoStylesInput | null,
    transitionProperties: CSSTransitionProperties | null
  ): void {
    if (this.isUnchanged(input, transitionProperties)) {
      return;
    }
    this.register(input, transitionProperties);
  }

  unmountCleanup(): void {
    if (this.isRegistered) {
      this.detach();
    }
    this.prevSource = null;
    this.prevTransitionProperties = null;
  }

  private isUnchanged(
    source: PseudoStylesBySelector | PseudoStylesInput | null,
    transitionProperties: CSSTransitionProperties | null
  ): boolean {
    if (
      deepEqual(source, this.prevSource) &&
      deepEqual(transitionProperties, this.prevTransitionProperties)
    ) {
      return true;
    }
    this.prevSource = source;
    this.prevTransitionProperties = transitionProperties;
    return false;
  }

  // The native registry replaces a view's selectors on every registration, so
  // a re-render updates in place and only an empty input detaches.
  private register(
    input: PseudoStylesInput | null,
    transitionProperties: CSSTransitionProperties | null
  ) {
    if (
      !input ||
      (input.selectors.length === 0 && input.hostsGroup === undefined)
    ) {
      if (this.isRegistered) {
        this.detach();
      }
      return;
    }

    const normalizedTransition = transitionProperties
      ? normalizeCSSTransitionProperties(transitionProperties)
      : null;

    const builtDefaultStyle = this.propsBuilder.build(input.defaultStyle, {
      includeUnprocessed: true,
    });
    nullifyUndefinedValues(builtDefaultStyle);

    if (__DEV__) {
      validatePseudoStyles(
        input.selectors,
        input.defaultStyle,
        this.componentName
      );
    }
    registerPseudoStyles(this.shadowNodeWrapper, {
      defaultStyle: builtDefaultStyle,
      selectors: input.selectors.map((entry) =>
        this.buildPseudoStyleEntry(
          entry,
          builtDefaultStyle,
          normalizedTransition
        )
      ),
      ...(input.hostsGroup !== undefined && { hostsGroup: input.hostsGroup }),
    });
    this.isRegistered = true;
  }

  private detach() {
    unregisterPseudoStyles(this.viewTag);
    this.isRegistered = false;
  }

  private buildPseudoStyleEntry(
    { selector, group, selectorStyle }: PseudoStyleInput,
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
      ...(group !== undefined && { group }),
      selectorStyle: builtSelectorStyle,
      transition,
    };
  }
}

function pseudoStylesInputFromSelectors(
  pseudoStylesBySelector: PseudoStylesBySelector
): PseudoStylesInput | null {
  const defaultStyle: UnknownRecord = {};
  const selectors: PseudoStyleInput[] = [];
  for (const [selector, value] of Object.entries(pseudoStylesBySelector)) {
    if (!NATIVE_PSEUDO_SELECTORS.has(selector as NativePseudoSelectorKey)) {
      if (__DEV__) {
        logger.warn(
          `Pseudo selector "${selector}" is not supported on native and will be ignored.`
        );
      }
      continue;
    }
    Object.assign(defaultStyle, value.defaultStyle);
    selectors.push({
      selector: selector as NativePseudoSelectorKey,
      selectorStyle: value.selectorStyle,
    });
  }
  return selectors.length > 0 ? { defaultStyle, selectors } : null;
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
