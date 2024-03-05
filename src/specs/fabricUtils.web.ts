'use strict';
import type { TurboModule } from 'react-native';

function get<T extends TurboModule>(_name: string): T | null {
  return {} as T;
}
function getEnforcing<T extends TurboModule>(_name: string): T {
  return {} as T;
}

const TurboModuleRegistry = {
  get,
  getEnforcing,
};

export { TurboModuleRegistry };
