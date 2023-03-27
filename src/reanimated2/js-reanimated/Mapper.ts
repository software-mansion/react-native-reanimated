import { NestedObjectValues } from '../commonTypes';
import { shouldBeUseWeb } from '../PlatformChecker';
import { JSReanimated } from './commonTypes';
import MutableValue from './MutableValue';

export default class Mapper<T> {
  static MAPPER_ID = 1;
  id: number;
  inputs: MutableValue<T>[];
  outputs: MutableValue<T>[];
  mapper: () => void;

  dirty = true;

  constructor(
    module: JSReanimated,
    mapper: () => void,
    inputs: NestedObjectValues<MutableValue<T>>[] = [],
    outputs: NestedObjectValues<MutableValue<T>>[] = []
  ) {
    this.id = Mapper.MAPPER_ID++;
    this.inputs = this.extractMutablesFromArray(inputs);
    this.outputs = this.extractMutablesFromArray(outputs);
    this.mapper = mapper;

    const markDirty = () => {
      this.dirty = true;
      module.maybeRequestRender();
    };

    this.inputs.forEach((input) => {
      input.addListener(markDirty);
    });
  }

  execute(): void {
    this.dirty = false;
    this.mapper();
  }

  extractMutablesFromArray<T>(
    array: NestedObjectValues<MutableValue<T>>
  ): MutableValue<T>[] {
    const res: MutableValue<T>[] = [];

    function extractMutables(value: NestedObjectValues<MutableValue<T>>) {
      if (value == null) {
        // return;
      } else if (value instanceof MutableValue) {
        res.push(value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => extractMutables(v));
      } else if (isWebDomElement(value)) {
        // do nothing on dom elements
        // without this check, we get a "Maximum call size exceeded error"
      } else if (typeof value === 'object') {
        Object.keys(value).forEach((key) => {
          extractMutables(value[key]);
        });
      }
    }

    extractMutables(array);
    return res;
  }
}

function isWebDomElement(value: any) {
  if (!shouldBeUseWeb()) {
    return false;
  }

  // https://stackoverflow.com/a/384380/7869175
  function isWebNode(o: any) {
    return typeof Node === 'object'
      ? o instanceof Node
      : o &&
          typeof o === 'object' &&
          typeof o.nodeType === 'number' &&
          typeof o.nodeName === 'string';
  }

  function isWebElement(o: any) {
    return typeof HTMLElement === 'object'
      ? o instanceof HTMLElement // DOM2
      : o &&
          typeof o === 'object' &&
          o !== null &&
          o.nodeType === 1 &&
          typeof o.nodeName === 'string';
  }

  return isWebNode(value) || isWebElement(value);
}
