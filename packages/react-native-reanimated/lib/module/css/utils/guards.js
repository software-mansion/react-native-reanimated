'use strict';

import { ANIMATION_SETTINGS, TRANSITION_PROPS, VALID_PARAMETRIZED_TIMING_FUNCTIONS, VALID_PREDEFINED_TIMING_FUNCTIONS, VALID_STEPS_MODIFIERS } from "../constants/index.js";
const ANIMATION_SETTINGS_SET = new Set(ANIMATION_SETTINGS);
const TRANSITION_PROPS_SET = new Set(TRANSITION_PROPS);
const VALID_STEPS_MODIFIERS_SET = new Set(VALID_STEPS_MODIFIERS);
export const VALID_PREDEFINED_TIMING_FUNCTIONS_SET = new Set(VALID_PREDEFINED_TIMING_FUNCTIONS);
export const VALID_PARAMETRIZED_TIMING_FUNCTIONS_SET = new Set(VALID_PARAMETRIZED_TIMING_FUNCTIONS);
export const isPredefinedTimingFunction = value => VALID_PREDEFINED_TIMING_FUNCTIONS_SET.has(value);
export const smellsLikeTimingFunction = value => VALID_PREDEFINED_TIMING_FUNCTIONS_SET.has(value) || VALID_PARAMETRIZED_TIMING_FUNCTIONS_SET.has(value.split('(')[0].trim());
export const isAnimationSetting = key => ANIMATION_SETTINGS_SET.has(key);
export const isTransitionProp = key => TRANSITION_PROPS_SET.has(key);
export const isStepsModifier = value => VALID_STEPS_MODIFIERS_SET.has(value);
export const isCSSStyleProp = key => isTransitionProp(key) || isAnimationSetting(key) || key === 'animationName';
export const isTimeUnit = value =>
// TODO: implement more strict check
typeof value === 'string' && (/^-?(\d+)?(\.\d+)?(ms|s)$/.test(value) || value === '0');
export const isNumber = value => typeof value === 'number' && !isNaN(value);
export const isPercentage = value => typeof value === 'string' && /^-?\d+(\.\d+)?%$/.test(value);
export const isAngleValue = value => typeof value === 'string' && /^-?\d+(\.\d+)?(deg|rad)$/.test(value);
export const isDefined = value => value !== undefined && value !== null;
export const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
export const isNumberArray = value => Array.isArray(value) && value.every(isNumber);
export const isArrayOfLength = (value, length) => Array.isArray(value) && value.length === length;
export const isCSSKeyframesObject = value => typeof value === 'object' && Object.keys(value).length > 0;
export const isCSSKeyframesRule = value => typeof value === 'object' && 'cssRules' in value && 'cssText' in value;
export const isConfigPropertyAlias = value => !!value && typeof value === 'object' && 'as' in value && typeof value.as === 'string';
export const hasProp = (obj, key) => key in obj;
//# sourceMappingURL=guards.js.map