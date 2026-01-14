#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <string>
#include <vector>

namespace reanimated::css {

using namespace facebook;

using EasingFunction = std::function<double(double)>;
using ColorChannels = std::array<uint8_t, 4>;

struct FieldValidator {
  std::string fieldName;
  std::function<bool(const folly::dynamic &)> validateDynamic;
  std::function<bool(jsi::Runtime &, const jsi::Value &)> validateJSI;
};

} // namespace reanimated::css
