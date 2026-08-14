#pragma once

#include <jsi/jsi.h>

namespace reanimated::css {

using namespace facebook;

/// jsi has no Value::isArray, since an array is an object there - the check
/// takes two hops, and skipping the first one asserts on a non-object.
inline bool isJSIArray(jsi::Runtime &rt, const jsi::Value &value) {
  return value.isObject() && value.getObject(rt).isArray(rt);
}

} // namespace reanimated::css
