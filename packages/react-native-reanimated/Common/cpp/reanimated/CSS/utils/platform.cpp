#include <reanimated/CSS/utils/platform.h>

#include <unordered_map>

namespace reanimated::css {

namespace {

// CSS-spec defaults; mirror Common/cpp/reanimated/CSS/InterpolatorRegistry.cpp.
const std::unordered_map<std::string, PlatformValue> kDefaults = {
    {"opacity", 1.0},
};

PlatformValue parseDouble(const jsi::Value &value) {
  return value.isNumber() ? PlatformValue(value.asNumber()) : PlatformValue{};
}

} // namespace

PlatformValue parsePlatformValue(jsi::Runtime &rt, const std::string &propertyName, const jsi::Value &value) {
  if (value.isNull() || value.isUndefined()) {
    const auto it = kDefaults.find(propertyName);
    return it != kDefaults.end() ? it->second : PlatformValue{};
  }
  if (propertyName == "opacity") {
    return parseDouble(value);
  }
  return PlatformValue{};
}

PlatformValue parsePlatformValue(const std::string &propertyName, const folly::dynamic &value) {
  if (value.isNull()) {
    const auto it = kDefaults.find(propertyName);
    return it != kDefaults.end() ? it->second : PlatformValue{};
  }
  if (propertyName == "opacity") {
    return value.isNumber() ? PlatformValue(value.asDouble()) : PlatformValue{};
  }
  return PlatformValue{};
}

} // namespace reanimated::css
