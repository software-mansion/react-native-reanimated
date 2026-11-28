Fix Vitest being detected as Jest, which on web replaced `requestAnimationFrame` with a `setTimeout`, ran mappers synchronously and turned the static feature flags off.
