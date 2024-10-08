#pragma once

#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/Fabric/PropsRegistry.h>
#include "LayoutAnimationsUtils.h" // to use type Rectangle

#include <string>

#ifdef __ANDROID__ // parse color on android
#include <iomanip>
#include <sstream>
#endif

namespace reanimated {

#ifdef __ANDROID__
static inline std::string colorToString(const SharedColor &color) {
  // Operator "*" of class SharedColor is overloaded and returns a private
  // class member color_ of type Color
  int val = *color;

  std::stringstream
      invertedHexColorStream; // By default transparency is first, color second
  invertedHexColorStream << std::setfill('0') << std::setw(8) << std::hex
                         << val;

  auto invertedHexColor = invertedHexColorStream.str();
  auto hexColor =
      "#" + invertedHexColor.substr(2, 6) + invertedHexColor.substr(0, 2);

  return hexColor;
}

#else
inline std::string colorToString(const SharedColor &value) {
  ColorComponents components = colorComponentsFromColor(value);
  auto ratio = 255.f;
  return "rgba(" + folly::to<std::string>(round(components.red * ratio)) +
      ", " + folly::to<std::string>(round(components.green * ratio)) + ", " +
      folly::to<std::string>(round(components.blue * ratio)) + ", " +
      folly::to<std::string>(round(components.alpha * ratio)) + ")";
}
#endif

inline Float floatFromYogaOptionalFloat(yoga::FloatOptional value) {
  if (value.isUndefined() || std::isnan(value.unwrap())) {
    return 0;
  }
  return (Float)value.unwrap();
}

inline Float floatFromYogaBorderWidthValue(const yoga::Style::Length &length) {
  if (length.unit() == yoga::Unit::Point) {
    return floatFromYogaOptionalFloat(length.value());
  }
  // types percent, and auto are not allowed for border width
  return 0;
}

struct LayoutSnapshot {
  double x, y, width, height, windowWidth, windowHeight;
  LayoutSnapshot(const ShadowView &shadowView, Rectangle window) {
    const auto &frame = shadowView.layoutMetrics.frame;
    x = frame.origin.x;
    y = frame.origin.y;
    width = frame.size.width;
    height = frame.size.height;
    windowWidth = window.width;
    windowHeight = window.height;
  }
};

static const int numberOfStringProperties = 6;
static const char *stringPropertiesNames[6] = {
    "BackgroundColor",
    "ShadowColor",

    "BorderTopColor",
    "BorderRightColor",
    "BorderBottomColor",
    "BorderLeftColor",
};

static const int numberOfNumericProperties = 9;
static const char *numericPropertiesNames[9] = {
    "Opacity", // double

    "BorderTopLeftRadius", // int
    "BorderTopRightRadius",
    "BorderBottomLeftRadius",
    "BorderBottomRightRadius",

    "BorderLeftWidth", // float
    "BorderRightWidth",
    "BorderTopWidth",
    "BorderBottomWidth"};

struct StyleSnapshot {
  std::array<double, 9> numericPropertiesValues;
  std::array<std::string, 6> stringPropertiesValues;
  std::array<Float, 16> transformMatrix;

  StyleSnapshot(
      jsi::Runtime &runtime,
      const ShadowView &shadowView,
      Rectangle window) {
    const ViewProps *props =
        static_cast<const ViewProps *>(shadowView.props.get());

    auto backgroundColor = colorToString(props->backgroundColor);
    auto shadowColor = colorToString(props->shadowColor);
    auto opacity = props->opacity;

    Transform transform = props->resolveTransform(shadowView.layoutMetrics);
    transformMatrix = transform.matrix;

    BorderMetrics cascadedBorderMetrics =
        props->resolveBorderMetrics(shadowView.layoutMetrics);

    numericPropertiesValues = {
        opacity,

        static_cast<double>(cascadedBorderMetrics.borderRadii.topLeft),
        static_cast<double>(cascadedBorderMetrics.borderRadii.topRight),
        static_cast<double>(cascadedBorderMetrics.borderRadii.bottomLeft),
        static_cast<double>(cascadedBorderMetrics.borderRadii.bottomRight),

        static_cast<double>(cascadedBorderMetrics.borderWidths.left),
        static_cast<double>(cascadedBorderMetrics.borderWidths.right),
        static_cast<double>(cascadedBorderMetrics.borderWidths.top),
        static_cast<double>(cascadedBorderMetrics.borderWidths.bottom),
    };

    auto topBorderColor = colorToString(cascadedBorderMetrics.borderColors.top);
    auto rightBorderColor =
        colorToString(cascadedBorderMetrics.borderColors.right);
    auto bottomBorderColor =
        colorToString(cascadedBorderMetrics.borderColors.bottom);
    auto leftBorderColor =
        colorToString(cascadedBorderMetrics.borderColors.left);

    stringPropertiesValues = {
        backgroundColor,
        shadowColor,

        topBorderColor,
        rightBorderColor,
        bottomBorderColor,
        leftBorderColor};
  }
};

}; // namespace reanimated
#endif
