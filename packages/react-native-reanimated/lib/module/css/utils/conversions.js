'use strict';

export function convertPropertyToArray(value) {
  return value !== undefined ? Array.isArray(value) ? value : [value] : [];
}
export function convertPropertiesToArrays(config) {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [key, convertPropertyToArray(value)]));
}
export function kebabizeCamelCase(property) {
  return property.replace(/[A-Z]/g, x => `-${x.toLowerCase()}`);
}
export function camelizeKebabCase(property) {
  return property.replace(/-./g, x => x[1].toUpperCase());
}
//# sourceMappingURL=conversions.js.map