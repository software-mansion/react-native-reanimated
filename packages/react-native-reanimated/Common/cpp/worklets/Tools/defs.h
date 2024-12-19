#pragma once

// JS_RUNTIME_HERMES is only set on Android so we have to check __has_include
// on iOS.
#if __APPLE__ && __has_include(<hermes/hermes.h>)
#define JS_RUNTIME_HERMES 1
#endif
