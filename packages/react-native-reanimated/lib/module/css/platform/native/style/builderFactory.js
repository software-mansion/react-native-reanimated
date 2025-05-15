'use strict';

import { isConfigPropertyAlias, isDefined, isRecord } from "../../../utils/index.js";
class StyleBuilderImpl {
  processedProps = {};
  constructor(config, buildHandler) {
    this.config = config;
    this.buildHandler = buildHandler;
  }
  add(property, value) {
    const configValue = this.config[property];
    if (!configValue || !isDefined(value)) {
      return;
    }
    if (configValue === true) {
      this.maybeAssignProp(property, value);
    } else if (isConfigPropertyAlias(configValue)) {
      this.add(configValue.as, value);
    } else {
      const {
        process
      } = configValue;
      const processedValue = process ? process(value) : value;
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
  build() {
    const result = this.buildHandler(this.processedProps);
    this.cleanup();
    if (Object.keys(result).length === 0) {
      return null;
    }
    return result;
  }
  buildFrom(props) {
    Object.entries(props).forEach(([key, value]) => this.add(key, value));
    return this.build();
  }
  maybeAssignProp(property, value) {
    this.processedProps[property] ??= value;
  }
  maybeAssignProps(props) {
    Object.entries(props).forEach(([key, value]) => this.maybeAssignProp(key, value));
  }
  cleanup() {
    this.processedProps = {};
  }
}
export default function createStyleBuilder(config, buildHandler = props => props) {
  return new StyleBuilderImpl(config, buildHandler);
}
//# sourceMappingURL=builderFactory.js.map