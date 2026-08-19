#include <reanimated/LayoutAnimations/LayoutNativeAnimationStructureParser.h>

#include <string>
#include <utility>

namespace reanimated {

namespace {

using facebook::jsi::Object;
using facebook::jsi::Runtime;
using facebook::jsi::Value;

std::optional<double> numberProperty(Runtime &rt, const Object &object, const char *name) {
  const auto value = object.getProperty(rt, name);
  if (!value.isNumber()) {
    return std::nullopt;
  }
  return value.getNumber();
}

std::optional<native_animation::AnimationTiming> parseEasing(Runtime &rt, const Object &easing) {
  const auto kindValue = easing.getProperty(rt, "kind");
  if (!kindValue.isString()) {
    return std::nullopt;
  }
  const auto kind = kindValue.getString(rt).utf8(rt);
  if (kind == "linear") {
    return native_animation::AnimationTiming{native_animation::LinearTiming{}};
  }
  if (kind == "cubicBezier") {
    const auto x1 = numberProperty(rt, easing, "x1");
    const auto y1 = numberProperty(rt, easing, "y1");
    const auto x2 = numberProperty(rt, easing, "x2");
    const auto y2 = numberProperty(rt, easing, "y2");
    if (!x1 || !y1 || !x2 || !y2) {
      return std::nullopt;
    }
    return native_animation::AnimationTiming{native_animation::CubicBezier{*x1, *y1, *x2, *y2}};
  }
  // An `opaque` or unknown curve has no common timing data.
  return std::nullopt;
}

// Flattens delay wrappers into one accumulated delay around the leaf. Nested
// delays wait one after the other, so their sum preserves the behavior.
LayoutNativeAnimationLeaf parseNode(Runtime &rt, const Value &nodeValue, double &delayMs) {
  constexpr int maxDelayDepth = 64;
  Value current{rt, nodeValue};
  for (int depth = 0; depth < maxDelayDepth; ++depth) {
    if (!current.isObject()) {
      return LayoutNativeUnsupportedLeaf{};
    }
    const auto node = current.getObject(rt);
    const auto kindValue = node.getProperty(rt, "kind");
    if (!kindValue.isString()) {
      return LayoutNativeUnsupportedLeaf{};
    }
    const auto kind = kindValue.getString(rt).utf8(rt);
    if (kind == "delay") {
      const auto nodeDelay = numberProperty(rt, node, "delayMs");
      if (!nodeDelay) {
        return LayoutNativeUnsupportedLeaf{};
      }
      delayMs += *nodeDelay;
      current = node.getProperty(rt, "node");
      continue;
    }
    if (kind == "timing") {
      const auto toValue = numberProperty(rt, node, "toValue");
      const auto durationMs = numberProperty(rt, node, "durationMs");
      const auto easingValue = node.getProperty(rt, "easing");
      if (!toValue || !durationMs || !easingValue.isObject()) {
        return LayoutNativeUnsupportedLeaf{};
      }
      return LayoutNativeTimingLeaf{*toValue, *durationMs, parseEasing(rt, easingValue.getObject(rt))};
    }
    return LayoutNativeUnsupportedLeaf{};
  }
  return LayoutNativeUnsupportedLeaf{};
}

} // namespace

LayoutNativeAnimationParseResult
parseLayoutNativeAnimationBuild(Runtime &rt, const Value &summary, const size_t maxProperties) {
  constexpr auto malformed =
      native_animation::TrackBuildFailure{native_animation::TrackBuildFailureReason::UnsupportedTrackForm};
  if (!summary.isObject()) {
    return malformed;
  }
  const auto summaryObject = summary.getObject(rt);
  const auto limitExceeded = summaryObject.getProperty(rt, "limitExceeded");
  if (limitExceeded.isBool() && limitExceeded.getBool()) {
    // The JS build stopped at the property cap and carries no entries.
    return native_animation::TrackBuildFailure{native_animation::TrackBuildFailureReason::ResourceLimit};
  }
  const auto propertiesValue = summaryObject.getProperty(rt, "properties");
  if (!propertiesValue.isObject() || !propertiesValue.getObject(rt).isArray(rt)) {
    return malformed;
  }
  const auto properties = propertiesValue.getObject(rt).getArray(rt);
  const auto count = properties.size(rt);
  // Reject oversized work before it allocates or copies anything.
  if (count > maxProperties) {
    return native_animation::TrackBuildFailure{native_animation::TrackBuildFailureReason::ResourceLimit};
  }

  const auto hasUnanimatedInitialValues = summaryObject.getProperty(rt, "hasUnanimatedInitialValues");
  if (!hasUnanimatedInitialValues.isBool()) {
    return malformed;
  }

  LayoutNativeAnimationBuildInput input;
  input.hasUnanimatedInitialValues = hasUnanimatedInitialValues.getBool();
  input.properties.reserve(count);
  for (size_t index = 0; index < count; ++index) {
    const auto entryValue = properties.getValueAtIndex(rt, index);
    if (!entryValue.isObject()) {
      return malformed;
    }
    const auto entry = entryValue.getObject(rt);
    const auto propertyValue = entry.getProperty(rt, "property");
    if (!propertyValue.isString()) {
      return malformed;
    }
    LayoutNativeAnimatedProperty property;
    property.property = propertyValue.getString(rt).utf8(rt);
    property.initialValue = numberProperty(rt, entry, "initialValue");
    property.leaf = parseNode(rt, entry.getProperty(rt, "node"), property.delayMs);
    input.properties.push_back(std::move(property));
  }
  return input;
}

} // namespace reanimated
