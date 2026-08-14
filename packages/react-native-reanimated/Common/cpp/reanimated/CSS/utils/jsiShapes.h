#pragma once

#include <jsi/jsi.h>

#include <optional>
#include <utility>

namespace reanimated::css {

using namespace facebook;

/// jsi has no Value::isArray, since an array is an object there - the check
/// takes two hops, and skipping the first one asserts on a non-object.
inline bool isJSIArray(jsi::Runtime &rt, const jsi::Value &value) {
  return value.isObject() && value.getObject(rt).isArray(rt);
}

/// The array behind the value, or nullopt when it is not one. Use this rather
/// than isJSIArray() followed by a conversion, which walks the value twice -
/// here the object is converted once and moved into the result.
inline std::optional<jsi::Array> asJSIArray(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject()) {
    return std::nullopt;
  }

  auto object = value.getObject(rt);
  if (!object.isArray(rt)) {
    return std::nullopt;
  }

  return std::move(object).getArray(rt);
}

} // namespace reanimated::css
