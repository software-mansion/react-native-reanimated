#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <string>
#include <unordered_set>
#include <variant>
#include <vector>

namespace reanimated::css {

using namespace facebook;

/// A record key (e.g. "boxShadow") or an index into an array-typed property
/// (e.g. the 0 in boxShadow[0]).
using PropertyPathSegment = std::variant<std::string, size_t>;
using PropertyPath = std::vector<PropertyPathSegment>;
using TransitionProperties = std::unordered_set<std::string>;

using EasingFunction = std::function<double(double)>;
using ColorChannels = std::array<uint8_t, 4>;

struct FieldValidator {
  std::string fieldName;
  std::function<bool(const folly::dynamic &)> validateDynamic;
  std::function<bool(jsi::Runtime &, const jsi::Value &)> validateJSI;
};

} // namespace reanimated::css
