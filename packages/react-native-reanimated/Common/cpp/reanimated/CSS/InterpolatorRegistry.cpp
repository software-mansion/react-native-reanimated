#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDiscreteArray.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/values/complex/CSSBoxShadow.h>

#include <reanimated/CSS/svg/values/SVGBrush.h>
#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/svg/values/SVGPath.h>
#include <reanimated/CSS/svg/values/SVGStops.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>
#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

#include <reanimated/CSS/interpolation/filters/operations/blur.h>
#include <reanimated/CSS/interpolation/filters/operations/brightness.h>
#include <reanimated/CSS/interpolation/filters/operations/contrast.h>
#include <reanimated/CSS/interpolation/filters/operations/dropShadow.h>
#include <reanimated/CSS/interpolation/filters/operations/grayscale.h>
#include <reanimated/CSS/interpolation/filters/operations/hueRotate.h>
#include <reanimated/CSS/interpolation/filters/operations/invert.h>
#include <reanimated/CSS/interpolation/filters/operations/opacity.h>
#include <reanimated/CSS/interpolation/filters/operations/saturate.h>
#include <reanimated/CSS/interpolation/filters/operations/sepia.h>

#include <limits>
#include <string>
#include <vector>

namespace reanimated::css {

namespace {

// Private implementation details
const std::array<uint8_t, 4> BLACK = {0, 0, 0, 255};
const std::array<uint8_t, 4> TRANSPARENT = {0, 0, 0, 0};

InterpolatorFactoriesRecord mergeInterpolators(const std::vector<InterpolatorFactoriesRecord> &maps) {
  InterpolatorFactoriesRecord result;
  for (const auto &map : maps) {
    result.insert(map.begin(), map.end());
  }
  return result;
}

// ==========================
// React Native Interpolators
// ==========================

const InterpolatorFactoriesRecord STYLE_INTERPOLATORS = {
    // Flexbox
    {"alignContent", value<CSSKeyword>("flex-start")},
    {"alignItems", value<CSSKeyword>("stretch")},
    {"alignSelf", value<CSSKeyword>("auto")},
    {"aspectRatio", value<CSSDouble, CSSKeyword>("auto")},
    {"borderBottomWidth", value<CSSDouble>(0)},
    {"borderEndWidth", value<CSSDouble>(0)},
    {"borderLeftWidth", value<CSSDouble>(0)},
    {"borderRightWidth", value<CSSDouble>(0)},
    {"borderStartWidth", value<CSSDouble>(0)},
    {"borderTopWidth", value<CSSDouble>(0)},
    {"borderWidth", value<CSSDouble>(0)},
    {"bottom", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
    {"boxSizing", value<CSSKeyword>("border-box")},
    {"display", value<CSSDisplay>("flex")},
    {"end", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
    {"flex", value<CSSDouble>(0)},
    {"flexBasis", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
    {"flexDirection", value<CSSKeyword>("column")},
    {"rowGap", value<CSSLength>(0, {RelativeTo::Self, "height"})},
    {"columnGap", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"flexGrow", value<CSSDouble>(0)},
    {"flexShrink", value<CSSDouble>(0)},
    {"flexWrap", value<CSSKeyword>("no-wrap")},
    {"height", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
    {"justifyContent", value<CSSKeyword>("flex-start")},
    {"left", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
    {"margin", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"marginBottom", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"marginEnd", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"marginHorizontal", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"marginLeft", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"marginRight", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"marginStart", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"marginTop", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"marginVertical", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"maxHeight", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
    {"maxWidth", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
    {"minHeight", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
    {"minWidth", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
    {"overflow", value<CSSKeyword>("visible")},
    {"padding", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"paddingBottom", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"paddingEnd", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"paddingHorizontal", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"paddingLeft", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"paddingRight", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"paddingStart", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"paddingTop", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"paddingVertical", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
    {"position", value<CSSKeyword>("relative")},
    {"right", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
    {"start", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
    {"top", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"})},
    {"width", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"})},
    {"zIndex", value<CSSInteger>(0)},
    {"direction", value<CSSKeyword>("inherit")},

    // Shadow (iOS)
    {"shadowColor", value<CSSColor>(BLACK)},
    {"shadowOffset", record({{"width", value<CSSDouble>(0)}, {"height", value<CSSDouble>(0)}})},
    {"shadowRadius", value<CSSDouble>(0)},
    {"shadowOpacity", value<CSSDouble>(1)},

    // Transforms
    {"transformOrigin",
     array(
         {value<CSSLength>("50%", {RelativeTo::Self, "width"}),
          value<CSSLength>("50%", {RelativeTo::Self, "height"}),
          value<CSSDouble>(0)})},
    {"transform",
     transforms(
         {{"perspective", transformOp<PerspectiveOperation>(std::numeric_limits<double>::infinity())},
          {"rotate", transformOp<RotateOperation>("0deg")},
          {"rotateX", transformOp<RotateXOperation>("0deg")},
          {"rotateY", transformOp<RotateYOperation>("0deg")},
          {"rotateZ", transformOp<RotateZOperation>("0deg")},
          {"scale", transformOp<ScaleOperation>(1)},
          {"scaleX", transformOp<ScaleXOperation>(1)},
          {"scaleY", transformOp<ScaleYOperation>(1)},
          {"translateX", transformOp<TranslateXOperation>(0, {RelativeTo::Self, "width"})},
          {"translateY", transformOp<TranslateYOperation>(0, {RelativeTo::Self, "height"})},
          {"skewX", transformOp<SkewXOperation>("0deg")},
          {"skewY", transformOp<SkewYOperation>("0deg")},
          {"matrix", transformOp<MatrixOperation>(TransformMatrix2D())}})},

    // Filters
    {"filter",
     filters(
         {{"blur", filterOp<BlurOperation>(0)},
          {"brightness", filterOp<BrightnessOperation>(1)},
          {"contrast", filterOp<ContrastOperation>(1)},
          {"dropShadow", filterOp<DropShadowOperation>(CSSDropShadow())},
          {"grayscale", filterOp<GrayscaleOperation>(0)},
          {"hueRotate", filterOp<HueRotateOperation>(0)},
          {"invert", filterOp<InvertOperation>(0)},
          {"opacity", filterOp<OpacityOperation>(1)},
          {"saturate", filterOp<SaturateOperation>(1)},
          {"sepia", filterOp<SepiaOperation>(0)}})},

    // View
    {"backfaceVisibility", value<CSSKeyword>("visible")},
    {"backgroundColor", value<CSSColor>(TRANSPARENT)},
    {"borderBlockColor", value<CSSColor>(BLACK)},
    {"borderBlockEndColor", value<CSSColor>(BLACK)},
    {"borderBlockStartColor", value<CSSColor>(BLACK)},
    {"borderBottomColor", value<CSSColor>(BLACK)},
    {"borderBottomEndRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderBottomLeftRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderBottomRightRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderBottomStartRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderColor", value<CSSColor>(BLACK)},
    {"borderCurve", value<CSSKeyword>("circular")},
    {"borderEndColor", value<CSSColor>(BLACK)},
    {"borderEndEndRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderEndStartRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderLeftColor", value<CSSColor>(BLACK)},
    {"borderRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderRightColor", value<CSSColor>(BLACK)},
    {"borderStartColor", value<CSSColor>(BLACK)},
    {"borderStartEndRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderStartStartRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderStyle", value<CSSKeyword>("solid")},
    {"borderTopColor", value<CSSColor>(BLACK)},
    {"borderTopEndRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderTopLeftRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderTopRightRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"borderTopStartRadius", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"outlineColor", value<CSSColor>(BLACK)},
    {"outlineOffset", value<CSSDouble>(0)},
    {"outlineStyle", value<CSSKeyword>("solid")},
    {"outlineWidth", value<CSSDouble>(0)},
    {"opacity", value<CSSDouble>(1)},
    {"elevation", value<CSSDouble>(0)},
    {"pointerEvents", value<CSSKeyword>("auto")},
    {"isolation", value<CSSKeyword>("auto")},
    {"cursor", value<CSSKeyword>("auto")},
    {"boxShadow", array({value<CSSBoxShadow>(CSSBoxShadow())})},
    {"mixBlendMode", value<CSSKeyword>("normal")},

    // Text
    {"color", value<CSSColor>(BLACK)},
    {"fontFamily", value<CSSKeyword>("inherit")},
    {"fontSize", value<CSSDouble>(14)},
    {"fontStyle", value<CSSKeyword>("normal")},
    {"fontWeight", value<CSSKeyword>("normal")},
    {"letterSpacing", value<CSSDouble>(0)},
    {"lineHeight", value<CSSDouble>(14)}, // TODO - should inherit from fontSize
    {"textAlign", value<CSSKeyword>("auto")},
    {"textDecorationLine", value<CSSKeyword>("none")},
    {"textShadowColor", value<CSSColor>(BLACK)},
    {"textShadowOffset", record({{"width", value<CSSDouble>(0)}, {"height", value<CSSDouble>(0)}})},
    {"textShadowRadius", value<CSSDouble>(0)},
    {"textTransform", value<CSSKeyword>("none")},
    {"userSelect", value<CSSKeyword>("auto")},

    // Text (iOS)
    {"fontVariant", value<CSSDiscreteArray<CSSKeyword>>(std::vector<CSSKeyword>{})},
    {"textDecorationColor", value<CSSColor>(BLACK)},
    {"textDecorationStyle", value<CSSKeyword>("solid")},
    {"writingDirection", value<CSSKeyword>("auto")},

    // Text (Android)
    {"textAlignVertical", value<CSSKeyword>("auto")},
    {"verticalAlign", value<CSSKeyword>("auto")},
    {"includeFontPadding", value<CSSBoolean>(false)},

    // Image
    {"resizeMode", value<CSSKeyword>("cover")},
    {"overlayColor", value<CSSColor>(BLACK)},
    {"tintColor", value<CSSColor>(BLACK)},
};

// =================
// SVG INTERPOLATORS
// =================

const InterpolatorFactoriesRecord SVG_COMMON_INTERPOLATORS = {
    // Color
    {"color", value<SVGBrush>(BLACK)},

    // Fill
    {"fill", value<SVGBrush>(BLACK)},
    {"fillOpacity", value<CSSDouble>(1)},
    {"fillRule", value<CSSIndex>(0)},

    // Stroke
    {"stroke", value<SVGBrush>(BLACK)},
    {"strokeWidth", value<SVGLength>(1)},
    {"strokeOpacity", value<CSSDouble>(1)},
    {"strokeDasharray", value<SVGStrokeDashArray, CSSKeyword>(SVGStrokeDashArray())},
    {"strokeDashoffset", value<SVGLength>(0)},
    {"strokeLinecap", value<CSSIndex>(0)},
    {"strokeLinejoin", value<CSSIndex>(0)},
    {"strokeMiterlimit", value<CSSDouble>(4)},
    {"vectorEffect", value<CSSIndex>(0)},

    // Clip
    {"clipRule", value<CSSKeyword>("nonzero")},
    {"clipPath", value<CSSKeyword>("none")},

    // Transform
    {"translateX", value<SVGLength>(0)},
    {"translateY", value<SVGLength>(0)},
    {"originX", value<SVGLength>(0)},
    {"originY", value<SVGLength>(0)},
    {"scaleX", value<CSSDouble>(1)},
    {"scaleY", value<CSSDouble>(1)},
    {"skewX", value<CSSAngle>(0)},
    {"skewY", value<CSSAngle>(0)},
    {"rotation", value<CSSAngle>(0)},

    // General
    {"opacity", value<CSSDouble>(1)},
};

// ================================
// SVG Component-Specific Interpolators
// ================================

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"cx", value<SVGLength, CSSKeyword>(0)},
         {"cy", value<SVGLength, CSSKeyword>(0)},
         {"r", value<SVGLength, CSSKeyword>(0)},
     }});

const InterpolatorFactoriesRecord SVG_ELLIPSE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"cx", value<SVGLength, CSSKeyword>(0)},
         {"cy", value<SVGLength, CSSKeyword>(0)},
         {"rx", value<SVGLength, CSSKeyword>(0)},
         {"ry", value<SVGLength, CSSKeyword>(0)},
     }});

const InterpolatorFactoriesRecord SVG_IMAGE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<SVGLength, CSSKeyword>(0)},
         {"y", value<SVGLength, CSSKeyword>(0)},
         {"width", value<SVGLength, CSSKeyword>(0)},
         {"height", value<SVGLength, CSSKeyword>(0)},
         // TODO: Check why this is not supported in RN-SVG and add support
         // {"align", value<CSSKeyword>("xMidYMid")},
         // {"meetOrSlice", value<CSSIndex>(0)},
     }});

const InterpolatorFactoriesRecord SVG_LINE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x1", value<SVGLength, CSSKeyword>(0)},
         {"y1", value<SVGLength, CSSKeyword>(0)},
         {"x2", value<SVGLength, CSSKeyword>(0)},
         {"y2", value<SVGLength, CSSKeyword>(0)},
     }});

const InterpolatorFactoriesRecord SVG_LINEAR_GRADIENT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x1", value<SVGLength, CSSKeyword>("0%")},
         {"x2", value<SVGLength, CSSKeyword>("100%")},
         {"y1", value<SVGLength, CSSKeyword>("0%")},
         {"y2", value<SVGLength, CSSKeyword>("0%")},
         {"gradient", value<SVGStops>(SVGStops())},
         {"gradientUnits", value<CSSIndex>(0)},
         // TODO: Implement 'gradientTransform'
         // {"gradientTransform", value<CSSKeyword>("")},
     }});

const InterpolatorFactoriesRecord SVG_RECT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<SVGLength, CSSKeyword>(0)},
         {"y", value<SVGLength, CSSKeyword>(0)},
         {"width", value<SVGLength, CSSKeyword>(0)},
         {"height", value<SVGLength, CSSKeyword>(0)},
         {"rx", value<SVGLength, CSSKeyword>(0)},
         {"ry", value<SVGLength, CSSKeyword>(0)},
     }});

const InterpolatorFactoriesRecord SVG_PATH_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"d", value<SVGPath>("")},
     }});

const InterpolatorFactoriesRecord SVG_RADIAL_GRADIENT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"r", value<SVGLength, CSSKeyword>("50%")},
         {"fx", value<SVGLength, CSSKeyword>("50%")},
         {"fy", value<SVGLength, CSSKeyword>("50%")},
         {"rx", value<SVGLength, CSSKeyword>("50%")},
         {"ry", value<SVGLength, CSSKeyword>("50%")},
         {"cx", value<SVGLength, CSSKeyword>("50%")},
         {"cy", value<SVGLength, CSSKeyword>("50%")},
         {"gradient", value<SVGStops>(SVGStops())},
         {"gradientUnits", value<CSSIndex>(0)},
         // TODO: Implement 'gradientTransform'
         // {"gradientTransform", value<CSSKeyword>("")},
     }});

// ==================
// COMPONENT REGISTRY
// ==================

constexpr bool SVG_FEATURE_ENABLED = StaticFeatureFlags::getFlag("EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS");

ComponentInterpolatorsMap initializeRegistry() {
  ComponentInterpolatorsMap registry = {};

  if (SVG_FEATURE_ENABLED) {
    // SVG Components
    registry["RNSVGCircle"] = SVG_CIRCLE_INTERPOLATORS;
    registry["RNSVGEllipse"] = SVG_ELLIPSE_INTERPOLATORS;
    registry["RNSVGImage"] = SVG_IMAGE_INTERPOLATORS;
    registry["RNSVGLine"] = SVG_LINE_INTERPOLATORS;
    registry["RNSVGLinearGradient"] = SVG_LINEAR_GRADIENT_INTERPOLATORS;
    registry["RNSVGPath"] = SVG_PATH_INTERPOLATORS;
    registry["RNSVGRect"] = SVG_RECT_INTERPOLATORS;
    registry["RNSVGRadialGradient"] = SVG_RADIAL_GRADIENT_INTERPOLATORS;
  }

  return registry;
}

ComponentInterpolatorsMap registry = initializeRegistry();

} // namespace

const InterpolatorFactoriesRecord &getComponentInterpolators(const std::string &nativeComponentName) {
  if (auto it = registry.find(nativeComponentName); it != registry.end()) {
    return it->second;
  }

  // Use SVG common interpolators as a fallback for unregistered SVG components
  if (SVG_FEATURE_ENABLED && nativeComponentName.starts_with("RNSVG")) {
    return SVG_COMMON_INTERPOLATORS;
  }

  // Use default style interpolators as a fallback for unknown components
  // (e.g. ExpoImage, which is not a RN component but should support RN Image styles)
  return STYLE_INTERPOLATORS;
}

void registerComponentInterpolators(
    const std::string &nativeComponentName,
    const InterpolatorFactoriesRecord &interpolators) {
  registry[nativeComponentName] = interpolators;
}

} // namespace reanimated::css