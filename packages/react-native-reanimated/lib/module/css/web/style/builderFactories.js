'use strict';

import { hasSuffix } from "../../../common/index.js";
import { hasProp, isConfigPropertyAlias, isDefined, isRecord, kebabizeCamelCase } from "../../utils/index.js";
const hasValueProcessor = configValue => typeof configValue === 'object' && configValue !== null && 'process' in configValue;
class BuilderBase {
  processedProps = {};
  constructor(config) {
    this.config = config;
  }
  add(property, value) {
    const configValue = this.config[property];
    if (!configValue || !isDefined(value) || configValue === false) {
      return;
    }
    if (configValue === true) {
      this.maybeAssignProp(property, String(value));
    } else if (typeof configValue === 'string') {
      this.maybeAssignProp(property, hasSuffix(value) ? value : `${String(value)}${configValue}`);
    } else if (isConfigPropertyAlias(configValue)) {
      this.add(configValue.as, value);
    } else {
      this.customProcess(property, value);
    }
  }
  maybeAssignProp(property, value) {
    this.processedProps[property] ??= value;
  }
  maybeAssignProps(properties) {
    Object.entries(properties).forEach(([key, value]) => this.maybeAssignProp(key, value));
  }
  handleProcess(property, value, process) {
    const processedValue = process ? process(value) : String(value);
    if (!isDefined(processedValue)) {
      return;
    }
    if (isRecord(processedValue)) {
      this.maybeAssignProps(processedValue);
    } else {
      this.maybeAssignProp(property, processedValue);
    }
  }
}
class StyleBuilderImpl extends BuilderBase {
  ruleBuildersSet = new Set();
  nameAliases = {};
  constructor(config, buildHandler) {
    super(config);
    this.buildHandler = buildHandler;
  }
  buildFrom(props) {
    Object.entries(props).forEach(([key, value]) => this.add(key, value));
    return this.build();
  }
  build() {
    this.buildRuleBuilders();
    const result = this.buildHandler(this.processedProps, this.nameAliases);
    this.cleanup();
    return result;
  }
  customProcess(property, value) {
    const configValue = this.config[property];
    if (typeof configValue !== 'object') {
      return;
    }
    if (isRuleBuilder(configValue)) {
      this.ruleBuildersSet.add(configValue);
      configValue.add(property, value);
    } else {
      if (hasValueProcessor(configValue)) {
        this.handleProcess(property, value, configValue.process);
      } else {
        this.maybeAssignProp(property, String(value));
      }
      if (hasProp(configValue, 'name')) {
        this.nameAliases[property] = configValue.name;
      }
    }
  }
  buildRuleBuilders() {
    // Build props which are created from other style properties
    this.ruleBuildersSet.forEach(builder => this.maybeAssignProps(builder.build()));
    this.ruleBuildersSet.clear();
  }
  cleanup() {
    this.processedProps = {};
    this.nameAliases = {};
  }
}
class RuleBuilderImpl extends BuilderBase {
  constructor(config, buildHandler) {
    super(config);
    this.buildHandler = buildHandler;
  }
  build() {
    const result = this.buildHandler(this.processedProps);
    this.cleanup();
    return result;
  }
  customProcess(property, value) {
    const configValue = this.config[property];
    if (hasValueProcessor(configValue)) {
      this.handleProcess(property, value, configValue.process);
    }
  }
  cleanup() {
    this.processedProps = {};
  }
}
const isRuleBuilder = value => value instanceof RuleBuilderImpl;
const defaultStyleBuildHandler = (props, nameAliases) => {
  const entries = Object.entries(props);
  if (entries.length === 0) {
    return null;
  }
  return entries.map(([key, value]) => `${nameAliases[key] ?? kebabizeCamelCase(key)}: ${value}`).join('; ');
};
export function createStyleBuilder(config, buildHandler = defaultStyleBuildHandler) {
  return new StyleBuilderImpl(config, buildHandler);
}
export function createRuleBuilder(config, buildHandler) {
  return new RuleBuilderImpl(config, buildHandler);
}
//# sourceMappingURL=builderFactories.js.map