#include <reanimated/CSS/utils/platform.h>

#include <reanimated/CSS/utils/props.h>

#include <cstdint>
#include <unordered_map>

namespace reanimated::css {

namespace {

// CSS-spec defaults; mirror Common/cpp/reanimated/CSS/InterpolatorRegistry.cpp.
const std::unordered_map<std::string, PlatformValue> kDefaults = {
    {"opacity", 1.0},
    {"borderWidth", 0.0},
    {"borderRadius", 0.0},
    {"shadowOpacity", 1.0},
    {"shadowRadius", 0.0},
    {"backgroundColor", std::array<double, 4>{0.0, 0.0, 0.0, 0.0}},
    {"borderColor", std::array<double, 4>{0.0, 0.0, 0.0, 1.0}},
    {"shadowColor", std::array<double, 4>{0.0, 0.0, 0.0, 1.0}},
    {"shadowOffset", std::array<double, 2>{0.0, 0.0}},
};

PlatformValue parseDouble(const jsi::Value &value) {
  return value.isNumber() ? PlatformValue(value.asNumber()) : PlatformValue{};
}

PlatformValue parseColor(const jsi::Value &value) {
  if (!value.isNumber()) {
    return PlatformValue{};
  }
  const auto channels = extractColorChannels(static_cast<int64_t>(value.asNumber()));
  return std::array<double, 4>{
      channels[0] / 255.0,
      channels[1] / 255.0,
      channels[2] / 255.0,
      channels[3] / 255.0,
  };
}

PlatformValue parseSize(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject()) {
    return PlatformValue{};
  }
  auto obj = value.asObject(rt);
  const auto width = obj.getProperty(rt, "width");
  const auto height = obj.getProperty(rt, "height");
  if (!width.isNumber() || !height.isNumber()) {
    return PlatformValue{};
  }
  return std::array<double, 2>{width.asNumber(), height.asNumber()};
}

} // namespace

PlatformValue parsePlatformValue(jsi::Runtime &rt, const std::string &propertyName, const jsi::Value &value) {
  if (value.isNull() || value.isUndefined()) {
    const auto it = kDefaults.find(propertyName);
    return it != kDefaults.end() ? it->second : PlatformValue{};
  }
  if (propertyName == "opacity" || propertyName == "borderWidth" || propertyName == "borderRadius" ||
      propertyName == "shadowOpacity" || propertyName == "shadowRadius") {
    return parseDouble(value);
  }
  if (propertyName == "backgroundColor" || propertyName == "borderColor" || propertyName == "shadowColor") {
    return parseColor(value);
  }
  if (propertyName == "shadowOffset") {
    return parseSize(rt, value);
  }
  return PlatformValue{};
}

} // namespace reanimated::css
