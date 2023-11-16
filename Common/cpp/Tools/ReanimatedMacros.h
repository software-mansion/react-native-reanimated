#pragma once

/*
We need this macro due to migration from DEBUG to NDEBUG macro. XCode does only
inject DEBUG out-of-the-box for Apps (unless the user removes that) so NDEBUG
has to be added manually. Unfortunately, as of now we have no way of injecting
NDEBUG into user's App on iOS without asking him to do: `PRODUCTION=1 pod
install`. However, since
https://github.com/facebook/react-native/commit/93fdcbaed0f69b268e1ae708a52df9463aae2d53
RN user's are no longer asked to do `PRODUCTION=1` and NDEBUG is injected by RN
automatically (on Fabric only). Therefore, we do the following:
- on Android we just look-up NDEBUG
- on iOS we look-up NDEBUG (we still inject it in .podspec when `PRODUCTION=1`)
  - if NDEBUG is not defined we check if Fabric is disabled
    - if Fabric is disabled, we check for out-of-the-box DEBUG
      - if DEBUG isn't defined it's almost safe to assume a release build
*/

#ifndef NDEBUG
#ifdef __APPLE__
#ifndef RCT_NEW_ARCH_ENABLED
#ifndef DEBUG
#define NDEBUG 1
#endif // DEBUG
#endif // RCT_NEW_ARCH_ENABLED
#endif // __APPLE__
#endif // NDEBUG
