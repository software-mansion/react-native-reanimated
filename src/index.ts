import * as Animated from './Animated';
import webGlobalIsInitialized from './reanimated2/js-reanimated/global';
if (!webGlobalIsInitialized) {
  /* 
    `webGlobalIsInitialized` should always be `true`, 
    but we need to use `webGlobalIsInitialized` somewhere to ensure function execution, 
    in another way, the bundler can remove unused variables. 
  */
  console.error('[Reanimated] Unable to initialize global objects for web.');
}

export * from './reanimated2';
export default Animated;
