#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <functional>
#include <string>

namespace reanimated::css {

struct FieldValidator {
  std::string fieldName;
  std::function<bool(const folly::dynamic &)> validateDynamic;
  std::function<bool(facebook::jsi::Runtime &, const facebook::jsi::Value &)> validateJSI;
};

} // namespace reanimated::css
