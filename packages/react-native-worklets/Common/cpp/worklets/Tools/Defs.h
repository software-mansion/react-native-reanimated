#pragma once

/*
On Android JS_RUNTIME_HERMES is set in CMakeList.txt,
but on iOS there is no simple way to defect if Hermes exists
so we have to check if headers are available.
*/
#if __APPLE__ && __has_include(<hermes/hermes.h>)
#define JS_RUNTIME_HERMES 1
#endif

#if REACT_NATIVE_MINOR_VERSION >= 84
#include <cxxreact/JSBigString.h>
namespace worklets {
using JSBigStringBuffer = facebook::react::JSBigString;
}
#else
#include <jsireact/JSIExecutor.h>
namespace worklets {
using JSBigStringBuffer = facebook::react::BigStringBuffer;
}
#endif // REACT_NATIVE_MINOR_VERSION >= 84
