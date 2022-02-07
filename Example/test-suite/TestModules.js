'use strict';

// List of all modules for tests. Each file path must be statically present for
// the packager to pick them all up.
export function getTestModules() {
  const modules = [
    // Sanity
    require('./tests/Basic'),
    require('./tests/Pitagoras'),
    require('./tests/AttachComponent'),
    require('./tests/AnimatedRef'),
    require('./tests/Colors'),
  ];

  return modules.filter(Boolean);
}
