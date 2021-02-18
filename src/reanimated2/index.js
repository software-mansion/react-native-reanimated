export * from './core';
export * from './Hooks';
export * from './animations';
export * from './interpolation';
export * from './Easing';
export * from './NativeMethods';
export * from './Colors';
export * from './PropAdapters';

if(process.env.JEST_WORKER_ID) {
  require('./Jest').SetUpTests();
}