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

const InterpolatorFactoriesRecord FLEX_INTERPOLATORS = {
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
    {"direction", value<CSSKeyword>("inherit")}};

const InterpolatorFactoriesRecord SHADOW_INTERPOLATORS_IOS = {
    {"shadowColor", value<CSSColor>(BLACK)},
    {"shadowOffset", record({{"width", value<CSSDouble>(0)}, {"height", value<CSSDouble>(0)}})},
    {"shadowRadius", value<CSSDouble>(0)},
    {"shadowOpacity", value<CSSDouble>(1)}};

const InterpolatorFactoriesRecord TRANSFORMS_INTERPOLATORS = {
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
};

const InterpolatorFactoriesRecord FILTER_INTERPOLATORS = {
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
          {"sepia", filterOp<SepiaOperation>(0)}})}};

const InterpolatorFactoriesRecord VIEW_INTERPOLATORS = mergeInterpolators(
    {FLEX_INTERPOLATORS,
     SHADOW_INTERPOLATORS_IOS,
     TRANSFORMS_INTERPOLATORS,
     FILTER_INTERPOLATORS,
     InterpolatorFactoriesRecord{
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
         {"mixBlendMode", value<CSSKeyword>("normal")}}});

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_IOS = {
    {"fontVariant", value<CSSDiscreteArray<CSSKeyword>>(std::vector<CSSKeyword>{})},
    {"textDecorationColor", value<CSSColor>(BLACK)},
    {"textDecorationStyle", value<CSSKeyword>("solid")},
    {"writingDirection", value<CSSKeyword>("auto")},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_ANDROID = {
    {"textAlignVertical", value<CSSKeyword>("auto")},
    {"verticalAlign", value<CSSKeyword>("auto")},
    {"includeFontPadding", value<CSSBoolean>(false)},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS = mergeInterpolators(
    {VIEW_INTERPOLATORS,
     TEXT_INTERPOLATORS_IOS,
     TEXT_INTERPOLATORS_ANDROID,
     InterpolatorFactoriesRecord{
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
     }});

const InterpolatorFactoriesRecord IMAGE_INTERPOLATORS = mergeInterpolators(
    {VIEW_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"resizeMode", value<CSSKeyword>("cover")},
         {"overlayColor", value<CSSColor>(BLACK)},
         {"tintColor", value<CSSColor>(BLACK)},
     }});

// =================
// SVG INTERPOLATORS
// =================

const InterpolatorFactoriesRecord SVG_COLOR_INTERPOLATORS = {
    {"color", value<SVGBrush>(BLACK)},
};

const InterpolatorFactoriesRecord SVG_FILL_INTERPOLATORS = {
    {"fill", value<SVGBrush>(BLACK)},
    {"fillOpacity", value<CSSDouble>(1)},
    {"fillRule", value<CSSInteger>(0)},
};

const InterpolatorFactoriesRecord SVG_STROKE_INTERPOLATORS = {
    {"stroke", value<SVGBrush>(BLACK)},
    {"strokeWidth", value<SVGLength>(1)},
    {"strokeOpacity", value<CSSDouble>(1)},
    {"strokeDasharray", value<SVGStrokeDashArray, CSSKeyword>(SVGStrokeDashArray())},
    {"strokeDashoffset", value<SVGLength>(0)},
    {"strokeLinecap", value<CSSInteger>(0)},
    {"strokeLinejoin", value<CSSInteger>(0)},
    {"strokeMiterlimit", value<CSSDouble>(4)},
    {"vectorEffect", value<CSSInteger>(0)},
};

const InterpolatorFactoriesRecord SVG_CLIP_INTERPOLATORS = {
    {"clipRule", value<CSSKeyword>("nonzero")},
    {"clipPath", value<CSSKeyword>("none")},
};

const InterpolatorFactoriesRecord SVG_TRANSFORM_INTERPOLATORS = {
    {"translateX", value<SVGLength>(0)},
    {"translateY", value<SVGLength>(0)},
    {"originX", value<SVGLength>(0)},
    {"originY", value<SVGLength>(0)},
    {"scaleX", value<CSSDouble>(1)},
    {"scaleY", value<CSSDouble>(1)},
    {"skewX", value<CSSAngle>(0)},
    {"skewY", value<CSSAngle>(0)},
    {"rotation", value<CSSAngle>(0)},
};

const InterpolatorFactoriesRecord SVG_COMMON_INTERPOLATORS = mergeInterpolators({
    SVG_COLOR_INTERPOLATORS,
    SVG_FILL_INTERPOLATORS,
    SVG_STROKE_INTERPOLATORS,
    InterpolatorFactoriesRecord{{"opacity", value<CSSDouble>(1)}},
});

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

const InterpolatorFactoriesRecord SVG_LINE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x1", value<SVGLength, CSSKeyword>(0)},
         {"y1", value<SVGLength, CSSKeyword>(0)},
         {"x2", value<SVGLength, CSSKeyword>(0)},
         {"y2", value<SVGLength, CSSKeyword>(0)},
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
         // TODO - add more properties
     }});

// ==================
// COMPONENT REGISTRY
// ==================

ComponentInterpolatorsMap initializeRegistry() {
  ComponentInterpolatorsMap registry = {
      // React Native Components
      {"View", VIEW_INTERPOLATORS},
      {"Paragraph", TEXT_INTERPOLATORS},
      {"Image", IMAGE_INTERPOLATORS},
  };

  if (StaticFeatureFlags::getFlag("EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS")) {
    // SVG Components
    registry["RNSVGCircle"] = SVG_CIRCLE_INTERPOLATORS;
    registry["RNSVGEllipse"] = SVG_ELLIPSE_INTERPOLATORS;
    registry["RNSVGLine"] = SVG_LINE_INTERPOLATORS;
    registry["RNSVGPath"] = SVG_PATH_INTERPOLATORS;
    registry["RNSVGRect"] = SVG_RECT_INTERPOLATORS;
  }

  return registry;
}

ComponentInterpolatorsMap registry = initializeRegistry();

} // namespace

const InterpolatorFactoriesRecord &getComponentInterpolators(const std::string &componentName) {
  if (auto it = registry.find(componentName); it != registry.end()) {
    return it->second;
  }

  // Use View interpolators as a fallback for unknown components
  // (e.g. we get the ScrollView component name for the ScrollView component
  // but it should be styled in the same way as a View)
  return VIEW_INTERPOLATORS;
}

void registerComponentInterpolators(
    const std::string &componentName,
    const InterpolatorFactoriesRecord &interpolators) {
  registry[componentName] = interpolators;
}

} // namespace reanimated::css
