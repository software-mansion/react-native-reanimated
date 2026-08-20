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

/// Whether every field the object does carry passes its validator. Absent fields
/// are fine: complex CSS values keep their defaults for anything left out.
inline bool canConstructFields(const folly::dynamic &value, const std::vector<FieldValidator> &validators) {
  if (!value.isObject()) {
    return false;
  }
  for (const auto &validator : validators) {
    if (value.count(validator.fieldName) > 0 && !validator.validateDynamic(value[validator.fieldName])) {
      return false;
    }
  }
  return true;
}

inline bool
canConstructFields(jsi::Runtime &rt, const jsi::Value &jsiValue, const std::vector<FieldValidator> &validators) {
  if (!jsiValue.isObject()) {
    return false;
  }
  const auto &obj = jsiValue.asObject(rt);
  for (const auto &validator : validators) {
    const auto *fieldName = validator.fieldName.c_str();
    if (obj.hasProperty(rt, fieldName) && !validator.validateJSI(rt, obj.getProperty(rt, fieldName))) {
      return false;
    }
  }
  return true;
}

} // namespace reanimated::css
