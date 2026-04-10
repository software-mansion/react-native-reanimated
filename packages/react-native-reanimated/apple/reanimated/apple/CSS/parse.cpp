#include <reanimated/apple/CSS/keyframes.h>

#include <reanimated/CSS/common/values/CSSColor.h>

#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css::apple {

namespace {

enum class CAPropertyType { Scalar, Color, ShadowOffset };

std::optional<CAPropertyType> supportedPropertyType(const std::string &name) {
  static const std::unordered_map<std::string, CAPropertyType> k = {
      {"opacity", CAPropertyType::Scalar},
      // TODO: Per-corner radii would require animating a CAShapeLayer mask path.
      {"borderRadius", CAPropertyType::Scalar},
      {"shadowOpacity", CAPropertyType::Scalar},
      {"shadowRadius", CAPropertyType::Scalar},
      {"backgroundColor", CAPropertyType::Color},
      {"borderColor", CAPropertyType::Color},
      {"shadowColor", CAPropertyType::Color},
      {"shadowOffset", CAPropertyType::ShadowOffset},
  };
  const auto it = k.find(name);
  return it != k.end() ? std::optional{it->second} : std::nullopt;
}

// Extracts a keyframe value from a JSI value.
// Returns nullopt if the value is undefined (inherit from layer)
// or if the JSI type doesn't match what CA expects for this property
// (e.g. color stored as packed int rather than RGBA array).
// TODO: Add transform support.
std::optional<CAKeyframeValue> parseKeyframeValue(jsi::Runtime &rt, CAPropertyType type, const jsi::Value &value) {
  if (value.isUndefined()) {
    return std::nullopt;
  }

  switch (type) {
    case CAPropertyType::Scalar: {
      if (!value.isNumber()) {
        return std::nullopt;
      }
      return value.asNumber();
    }
    case CAPropertyType::Color: {
      if (!CSSColor::canConstruct(rt, value)) {
        return std::nullopt;
      }
      const CSSColor color(rt, value);
      return CAColorRGBA{
          static_cast<double>(color.channels[0]),
          static_cast<double>(color.channels[1]),
          static_cast<double>(color.channels[2]),
          static_cast<double>(color.channels[3]),
      };
    }
    case CAPropertyType::ShadowOffset: {
      if (!value.isObject()) {
        return std::nullopt;
      }
      const auto arr = value.asObject(rt).asArray(rt);
      return CAShadowOffset{arr.getValueAtIndex(rt, 0).asNumber(), arr.getValueAtIndex(rt, 1).asNumber()};
    }
  }
}

// Returns empty vector if any keyframe value can't be parsed (signals
// the property should not animate on platform).
std::vector<CAKeyframe> buildKeyframesForProperty(jsi::Runtime &rt, const jsi::Value &keyframes, CAPropertyType type) {
  if (!keyframes.isObject() || !keyframes.asObject(rt).isArray(rt)) {
    return {};
  }

  const auto keyframeArray = keyframes.asObject(rt).asArray(rt);
  const auto keyframesCount = keyframeArray.size(rt);
  if (keyframesCount == 0) {
    return {};
  }

  const auto offsetAt = [&](size_t index) {
    return keyframeArray.getValueAtIndex(rt, index).asObject(rt).getProperty(rt, "offset").asNumber();
  };

  const auto hasOffset0 = offsetAt(0) == 0.0;
  const auto hasOffset1 = offsetAt(keyframesCount - 1) == 1.0;

  std::vector<CAKeyframe> result;
  result.reserve(keyframesCount + (hasOffset0 ? 0 : 1) + (hasOffset1 ? 0 : 1));

  if (!hasOffset0) {
    result.emplace_back(0.0, std::nullopt);
  }

  for (size_t i = 0; i < keyframesCount; ++i) {
    const jsi::Object keyframeObject = keyframeArray.getValueAtIndex(rt, i).asObject(rt);
    const double offset = keyframeObject.getProperty(rt, "offset").asNumber();
    const jsi::Value value = keyframeObject.getProperty(rt, "value");
    auto parsed = parseKeyframeValue(rt, type, value);
    if (!parsed.has_value() && !value.isUndefined()) {
      // Value exists but doesn't match the expected CA type
      // (e.g. color as packed int) — can't animate on platform.
      return {};
    }
    result.emplace_back(offset, std::move(parsed));
  }

  if (!hasOffset1) {
    result.emplace_back(1.0, std::nullopt);
  }

  return result;
}

} // namespace

std::shared_ptr<CAKeyframesMap> parseSupportedProperties(jsi::Runtime &rt, const jsi::Object &config) {
  auto result = std::make_shared<CAKeyframesMap>();
  const auto propKeyframes = config.getProperty(rt, "propKeyframes").asObject(rt);
  const auto propertyNames = propKeyframes.getPropertyNames(rt);
  const size_t propertyCount = propertyNames.size(rt);
  result->reserve(propertyCount);

  for (size_t i = 0; i < propertyCount; ++i) {
    const auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const auto type = supportedPropertyType(propertyName);
    if (!type.has_value()) {
      continue;
    }
    const auto propertyKeyframes = propKeyframes.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));
    auto kfs = buildKeyframesForProperty(rt, propertyKeyframes, type.value());
    if (!kfs.empty()) {
      result->emplace(propertyName, std::move(kfs));
    }
  }

  return result;
}

} // namespace reanimated::css::apple
