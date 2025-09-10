'use strict';

export function isSynchronizable(value) {
  return typeof value === 'object' && value !== null && '__synchronizableRef' in value && value.__synchronizableRef === true;
}
//# sourceMappingURL=isSynchronizable.js.map