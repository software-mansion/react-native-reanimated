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

#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>

#include <reanimated/CSS/svg/values/SVGLength.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>
#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

#include <vector>

namespace reanimated::css {

namespace {

// Private implementation details
const auto BLACK = CSSColor(0, 0, 0, 255);
const auto TRANSPARENT = CSSColor::Transparent;

InterpolatorFactoriesRecord mergeInterpolators(
    const std::vector<InterpolatorFactoriesRecord> &maps) {
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
    {"bottom",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"boxSizing", value<CSSKeyword>("border-box")},
    {"display", value<CSSDisplay>("flex")},
    {"end", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"flex", value<CSSDouble>(0)},
    {"flexBasis",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"flexDirection", value<CSSKeyword>("column")},
    {"rowGap", value<CSSLength>(RelativeTo::Self, "height", 0)},
    {"columnGap", value<CSSLength>(RelativeTo::Self, "width", 0)},
    {"flexGrow", value<CSSDouble>(0)},
    {"flexShrink", value<CSSDouble>(0)},
    {"flexWrap", value<CSSKeyword>("no-wrap")},
    {"height",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"justifyContent", value<CSSKeyword>("flex-start")},
    {"left", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"margin", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginBottom",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginEnd", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginHorizontal",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginLeft",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginRight",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginStart",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginTop", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"marginVertical",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"maxHeight",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"maxWidth",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"minHeight",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"minWidth",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"overflow", value<CSSKeyword>("visible")},
    {"padding", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingBottom",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingEnd",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingHorizontal",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingLeft",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingRight",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingStart",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingTop",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"paddingVertical",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", 0)},
    {"position", value<CSSKeyword>("relative")},
    {"right",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"start",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"top", value<CSSLength, CSSKeyword>(RelativeTo::Parent, "height", "auto")},
    {"width",
     value<CSSLength, CSSKeyword>(RelativeTo::Parent, "width", "auto")},
    {"zIndex", value<CSSInteger>(0)},
    {"direction", value<CSSKeyword>("inherit")}};

const InterpolatorFactoriesRecord SHADOW_INTERPOLATORS_IOS = {
    {"shadowColor", value<CSSColor>(BLACK)},
    {"shadowOffset",
     record({{"width", value<CSSDouble>(0)}, {"height", value<CSSDouble>(0)}})},
    {"shadowRadius", value<CSSDouble>(0)},
    {"shadowOpacity", value<CSSDouble>(1)}};

const InterpolatorFactoriesRecord TRANSFORMS_INTERPOLATORS = {
    {"transformOrigin",
     array(
         {value<CSSLength>(RelativeTo::Self, "width", "50%"),
          value<CSSLength>(RelativeTo::Self, "height", "50%"),
          value<CSSDouble>(0)})},
    {"transform",
     transforms(
         {{"perspective",
           transformOp<PerspectiveOperation>(0)}, // 0 - no perspective
          {"rotate", transformOp<RotateOperation>("0deg")},
          {"rotateX", transformOp<RotateXOperation>("0deg")},
          {"rotateY", transformOp<RotateYOperation>("0deg")},
          {"rotateZ", transformOp<RotateZOperation>("0deg")},
          {"scale", transformOp<ScaleOperation>(1)},
          {"scaleX", transformOp<ScaleXOperation>(1)},
          {"scaleY", transformOp<ScaleYOperation>(1)},
          {"translateX",
           transformOp<TranslateXOperation>(RelativeTo::Self, "width", 0)},
          {"translateY",
           transformOp<TranslateYOperation>(RelativeTo::Self, "height", 0)},
          {"skewX", transformOp<SkewXOperation>("0deg")},
          {"skewY", transformOp<SkewYOperation>("0deg")},
          {"matrix",
           transformOp<MatrixOperation>(TransformMatrix3D::Identity())}})},
};

const InterpolatorFactoriesRecord VIEW_INTERPOLATORS = mergeInterpolators(
    {FLEX_INTERPOLATORS,
     SHADOW_INTERPOLATORS_IOS,
     TRANSFORMS_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"backfaceVisibility", value<CSSKeyword>("visible")},
         {"backgroundColor", value<CSSColor>(TRANSPARENT)},
         {"borderBlockColor", value<CSSColor>(BLACK)},
         {"borderBlockEndColor", value<CSSColor>(BLACK)},
         {"borderBlockStartColor", value<CSSColor>(BLACK)},
         {"borderBottomColor", value<CSSColor>(BLACK)},
         {"borderBottomEndRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderBottomLeftRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderBottomRightRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderBottomStartRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderColor", value<CSSColor>(BLACK)},
         {"borderCurve", value<CSSKeyword>("circular")},
         {"borderEndColor", value<CSSColor>(BLACK)},
         {"borderEndEndRadius", value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderEndStartRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderLeftColor", value<CSSColor>(BLACK)},
         {"borderRadius", value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderRightColor", value<CSSColor>(BLACK)},
         {"borderStartColor", value<CSSColor>(BLACK)},
         {"borderStartEndRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderStartStartRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderStyle", value<CSSKeyword>("solid")},
         {"borderTopColor", value<CSSColor>(BLACK)},
         {"borderTopEndRadius", value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderTopLeftRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderTopRightRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"borderTopStartRadius",
          value<CSSLength>(RelativeTo::Self, "width", 0)},
         {"outlineColor", value<CSSColor>(BLACK)},
         {"outlineOffset", value<CSSDouble>(0)},
         {"outlineStyle", value<CSSKeyword>("solid")},
         {"outlineWidth", value<CSSDouble>(0)},
         {"opacity", value<CSSDouble>(1)},
         {"elevation", value<CSSDouble>(0)},
         {"pointerEvents", value<CSSKeyword>("auto")},
         {"isolation", value<CSSKeyword>("auto")},
         {"cursor", value<CSSKeyword>("auto")},
         {"boxShadow",
          array({record({
              {"offsetX", value<CSSDouble>(0)},
              {"offsetY", value<CSSDouble>(0)},
#ifdef ANDROID
              // For some reason Android crashes when blurRadius is smaller
              // than 1, so we use a custom value type that will never be
              // smaller than 1
              {"blurRadius", value<CSSShadowRadiusAndroid>(1)},
#else
              {"blurRadius", value<CSSDouble>(0)},
#endif
              {"spreadDistance", value<CSSDouble>(0)},
              {"color", value<CSSColor>(TRANSPARENT)},
              {"inset", value<CSSBoolean>(false)},
          })})},
         {"mixBlendMode", value<CSSKeyword>("normal")}}});

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_IOS = {
    {"fontVariant",
     value<CSSDiscreteArray<CSSKeyword>>(std::vector<CSSKeyword>{})},
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
         {"lineHeight",
          value<CSSDouble>(14)}, // TODO - should inherit from fontSize
         {"textAlign", value<CSSKeyword>("auto")},
         {"textDecorationLine", value<CSSKeyword>("none")},
         {"textShadowColor", value<CSSColor>(BLACK)},
         {"textShadowOffset",
          record(
              {{"width", value<CSSDouble>(0)},
               {"height", value<CSSDouble>(0)}})},
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
    {"color", value<CSSColor>(BLACK)},
};

const InterpolatorFactoriesRecord SVG_FILL_INTERPOLATORS = {
    {"fill", value<CSSColor>(BLACK)},
    {"fillOpacity", value<CSSDouble>(1)},
    {"fillRule", value<CSSInteger>(0)},
};

const InterpolatorFactoriesRecord SVG_STROKE_INTERPOLATORS = {
    {"stroke", value<CSSColor>(BLACK)},
    {"strokeWidth", value<SVGLength>(1)},
    {"strokeOpacity", value<CSSDouble>(1)},
    {"strokeDasharray",
     value<SVGStrokeDashArray, CSSKeyword>(SVGStrokeDashArray())},
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

const InterpolatorFactoriesRecord SVG_COMMON_INTERPOLATORS =
    mergeInterpolators({
        SVG_COLOR_INTERPOLATORS,
        SVG_FILL_INTERPOLATORS,
        SVG_STROKE_INTERPOLATORS,
    });

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"cx", value<SVGLength, CSSKeyword>(0)},
         {"cy", value<SVGLength, CSSKeyword>(0)},
         {"r", value<SVGLength, CSSKeyword>(0)},
         {"opacity", value<CSSDouble>(1)},
     }});

const InterpolatorFactoriesRecord SVG_ELLIPSE_INTERPOLATORS =
    mergeInterpolators(
        {SVG_COMMON_INTERPOLATORS,
         InterpolatorFactoriesRecord{
             {"cx", value<SVGLength, CSSKeyword>(0)},
             {"cy", value<SVGLength, CSSKeyword>(0)},
             {"rx", value<SVGLength, CSSKeyword>(0)},
             {"ry", value<SVGLength, CSSKeyword>(0)},
             {"opacity", value<CSSDouble>(1)},
         }});

const InterpolatorFactoriesRecord SVG_LINE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x1", value<SVGLength, CSSKeyword>(0)},
         {"y1", value<SVGLength, CSSKeyword>(0)},
         {"x2", value<SVGLength, CSSKeyword>(0)},
         {"y2", value<SVGLength, CSSKeyword>(0)},
         {"opacity", value<CSSDouble>(1)},
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
         {"opacity", value<CSSDouble>(1)},
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

  if (StaticFeatureFlags::getFlag(
          "EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS")) {
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

const InterpolatorFactoriesRecord &getComponentInterpolators(
    const std::string &componentName) {
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
