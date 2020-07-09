'use strict';

import { Platform } from 'react-native';

function optionalRequire(requirer) {
  try {
    return requirer();
  } catch (e) {
    // eslint-disable-next-line
    return;
  }
}


// List of all modules for tests. Each file path must be statically present for
// the packager to pick them all up.
export function getTestModules() {
  const modules = [
    // Sanity
    require('./tests/Basic'),
    require('./tests/Pitagoras'),
  ];

  
  return modules.filter(Boolean);
}
