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
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
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
#include <reanimated/CSS/utils/interpolatorPropsBuilderCallbacks.h>

namespace reanimated::css {

namespace {

template <typename... AllowedTypes>
using CSSCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>;

// Returns a dummy callback for unsupported properties.
// Use this when a property needs to be registered for interpolation but
// doesn't have AnimatedPropsBuilder support yet.
template <typename... AllowedTypes>
CSSCallback<AllowedTypes...> unsupported() {
  return [](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &) {
  };
}

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
    {"alignContent", value<CSSKeyword>("flex-start", CSSCallback<CSSKeyword>(addAlignContentToPropsBuilder))},
    {"alignItems", value<CSSKeyword>("stretch", CSSCallback<CSSKeyword>(addAlignItemsToPropsBuilder))},
    {"alignSelf", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addAlignSelfToPropsBuilder))},
    {"aspectRatio",
     value<CSSDouble, CSSKeyword>("auto", CSSCallback<CSSDouble, CSSKeyword>(addAspectRatioToPropsBuilder))},
    {"borderBottomWidth", value<CSSDouble>(0, CSSCallback<CSSDouble>(addBorderBottomWidthToPropsBuilder))},
    {"borderEndWidth", value<CSSDouble>(0, CSSCallback<CSSDouble>(addBorderEndWidthToPropsBuilder))},
    {"borderLeftWidth", value<CSSDouble>(0, CSSCallback<CSSDouble>(addBorderLeftWidthToPropsBuilder))},
    {"borderRightWidth", value<CSSDouble>(0, CSSCallback<CSSDouble>(addBorderRightWidthToPropsBuilder))},
    {"borderStartWidth", value<CSSDouble>(0, CSSCallback<CSSDouble>(addBorderStartWidthToPropsBuilder))},
    {"borderTopWidth", value<CSSDouble>(0, CSSCallback<CSSDouble>(addBorderTopWidthToPropsBuilder))},
    {"borderWidth", value<CSSDouble>(0, CSSCallback<CSSDouble>(addBorderWidthToPropsBuilder))},
    {"bottom",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "height"},
         CSSCallback<CSSLength, CSSKeyword>(addBottomToPropsBuilder))},
    {"boxSizing", value<CSSKeyword>("border-box", CSSCallback<CSSKeyword>(addBoxSizingToPropsBuilder))},
    {"display", value<CSSDisplay>("flex", CSSCallback<CSSDisplay>(addDisplayToPropsBuilder))},
    {"end",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addEndToPropsBuilder))},
    {"flex", value<CSSDouble>(0, CSSCallback<CSSDouble>(addFlexToPropsBuilder))},
    {"flexBasis",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addFlexBasisToPropsBuilder))},
    {"flexDirection", value<CSSKeyword>("column", CSSCallback<CSSKeyword>(addFlexDirectionToPropsBuilder))},
    {"rowGap", value<CSSLength>(0, {RelativeTo::Self, "height"}, CSSCallback<CSSLength>(addRowGapToPropsBuilder))},
    {"columnGap", value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSCallback<CSSLength>(addColumnGapToPropsBuilder))},
    {"flexGrow", value<CSSDouble>(0, CSSCallback<CSSDouble>(addFlexGrowToPropsBuilder))},
    {"flexShrink", value<CSSDouble>(0, CSSCallback<CSSDouble>(addFlexShrinkToPropsBuilder))},
    {"flexWrap", value<CSSKeyword>("no-wrap", CSSCallback<CSSKeyword>(addFlexWrapToPropsBuilder))},
    {"height",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "height"},
         CSSCallback<CSSLength, CSSKeyword>(addHeightToPropsBuilder))},
    {"justifyContent", value<CSSKeyword>("flex-start", CSSCallback<CSSKeyword>(addJustifyContentToPropsBuilder))},
    {"left",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addLeftToPropsBuilder))},
    {"margin",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginToPropsBuilder))},
    {"marginBottom",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginBottomToPropsBuilder))},
    {"marginEnd",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginEndToPropsBuilder))},
    {"marginHorizontal",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginHorizontalToPropsBuilder))},
    {"marginLeft",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginLeftToPropsBuilder))},
    {"marginRight",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginRightToPropsBuilder))},
    {"marginStart",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginStartToPropsBuilder))},
    {"marginTop",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginTopToPropsBuilder))},
    {"marginVertical",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMarginVerticalToPropsBuilder))},
    {"maxHeight",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "height"},
         CSSCallback<CSSLength, CSSKeyword>(addMaxHeightToPropsBuilder))},
    {"maxWidth",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMaxWidthToPropsBuilder))},
    {"minHeight",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "height"},
         CSSCallback<CSSLength, CSSKeyword>(addMinHeightToPropsBuilder))},
    {"minWidth",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addMinWidthToPropsBuilder))},
    {"overflow", value<CSSKeyword>("visible", CSSCallback<CSSKeyword>(addOverflowToPropsBuilder))},
    {"padding",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingToPropsBuilder))},
    {"paddingBottom",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingBottomToPropsBuilder))},
    {"paddingEnd",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingEndToPropsBuilder))},
    {"paddingHorizontal",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingHorizontalToPropsBuilder))},
    {"paddingLeft",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingLeftToPropsBuilder))},
    {"paddingRight",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingRightToPropsBuilder))},
    {"paddingStart",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingStartToPropsBuilder))},
    {"paddingTop",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingTopToPropsBuilder))},
    {"paddingVertical",
     value<CSSLength, CSSKeyword>(
         0,
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addPaddingVerticalToPropsBuilder))},
    {"position", value<CSSKeyword>("relative", CSSCallback<CSSKeyword>(addPositionToPropsBuilder))},
    {"right",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addRightToPropsBuilder))},
    {"start",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addStartToPropsBuilder))},
    {"top",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "height"},
         CSSCallback<CSSLength, CSSKeyword>(addTopToPropsBuilder))},
    {"width",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSCallback<CSSLength, CSSKeyword>(addWidthToPropsBuilder))},
    {"zIndex", value<CSSInteger>(0, CSSCallback<CSSInteger>(addZIndexToPropsBuilder))},
    {"direction", value<CSSKeyword>("inherit", CSSCallback<CSSKeyword>(addDirectionToPropsBuilder))}};

const InterpolatorFactoriesRecord SHADOW_INTERPOLATORS_IOS = {
    {"shadowColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addShadowColorToPropsBuilder))},
    {"shadowOffset",
     record({
         {"width", value<CSSDouble>(0, CSSCallback<CSSDouble>(addShadowOffsetWidthToPropsBuilder))},
         {"height", value<CSSDouble>(0, CSSCallback<CSSDouble>(addShadowOffsetHeightToPropsBuilder))},
     })},
    {"shadowRadius", value<CSSDouble>(0, CSSCallback<CSSDouble>(addShadowRadiusToPropsBuilder))},
    {"shadowOpacity", value<CSSDouble>(1, CSSCallback<CSSDouble>(addShadowOpacityToPropsBuilder))}};

const InterpolatorFactoriesRecord TRANSFORMS_INTERPOLATORS = {
    {"transformOrigin",
     array(
         {value<CSSLength>(
              "50%",
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addTransformOriginXToPropsBuilder)),
          value<CSSLength>(
              "50%",
              {RelativeTo::Self, "height"},
              CSSCallback<CSSLength>(addTransformOriginYToPropsBuilder)),
          value<CSSDouble>(0, CSSCallback<CSSDouble>(addTransformOriginZToPropsBuilder))})},
    {"transform",
     transforms(

         {{"perspective",
           transformOp<PerspectiveOperation>(
               std::numeric_limits<double>::infinity(),
               addPerspectiveTransformToPropsBuilder)},
          {"rotate", transformOp<RotateOperation>("0deg", addRotateTransformToPropsBuilder)},
          {"rotateX", transformOp<RotateXOperation>("0deg", addRotateXTransformToPropsBuilder)},
          {"rotateY", transformOp<RotateYOperation>("0deg", addRotateYTransformToPropsBuilder)},
          {"rotateZ", transformOp<RotateZOperation>("0deg", addRotateZTransformToPropsBuilder)},
          {"scale", transformOp<ScaleOperation>(1, addScaleTransformToPropsBuilder)},
          {"scaleX", transformOp<ScaleXOperation>(1, addScaleXTransformToPropsBuilder)},
          {"scaleY", transformOp<ScaleYOperation>(1, addScaleYTransformToPropsBuilder)},
          {"translateX",
           transformOp<TranslateXOperation>(0, {RelativeTo::Self, "width"}, addTranslateXTransformToPropsBuilder)},
          {"translateY",
           transformOp<TranslateYOperation>(0, {RelativeTo::Self, "height"}, addTranslateYTransformToPropsBuilder)},
          {"skewX", transformOp<SkewXOperation>("0deg", addSkewXTransformToPropsBuilder)},
          {"skewY", transformOp<SkewYOperation>("0deg", addSkewYTransformToPropsBuilder)},
          {"matrix", transformOp<MatrixOperation>(TransformMatrix2D(), addMatrixTransformToPropsBuilder)}})},
};

const InterpolatorFactoriesRecord FILTER_INTERPOLATORS = {
    {"filter",
     filters(
         {{"blur", filterOp<BlurOperation>(0, addBlurFilterToPropsBuilder)},
          {"brightness", filterOp<BrightnessOperation>(1, addBrightnessFilterToPropsBuilder)},
          {"contrast", filterOp<ContrastOperation>(1, addContrastFilterToPropsBuilder)},
          {"dropShadow", filterOp<DropShadowOperation>(CSSDropShadow(), addDropShadowFilterToPropsBuilder)},
          {"grayscale", filterOp<GrayscaleOperation>(0, addGrayscaleFilterToPropsBuilder)},
          {"hueRotate", filterOp<HueRotateOperation>(0, addHueRotateFilterToPropsBuilder)},
          {"invert", filterOp<InvertOperation>(0, addInvertFilterToPropsBuilder)},
          {"opacity", filterOp<OpacityOperation>(1, addOpacityFilterToPropsBuilder)},
          {"saturate", filterOp<SaturateOperation>(1, addSaturateFilterToPropsBuilder)},
          {"sepia", filterOp<SepiaOperation>(0, addSepiaFilterToPropsBuilder)}})}};

const InterpolatorFactoriesRecord VIEW_INTERPOLATORS = mergeInterpolators(
    {FLEX_INTERPOLATORS,
     SHADOW_INTERPOLATORS_IOS,
     TRANSFORMS_INTERPOLATORS,
     FILTER_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"backfaceVisibility",
          value<CSSKeyword>("visible", CSSCallback<CSSKeyword>(addBackfaceVisibilityToPropsBuilder))},
         {"backgroundColor", value<CSSColor>(TRANSPARENT, CSSCallback<CSSColor>(addBackgroundColorToPropsBuilder))},
         {"borderBlockColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderBlockColorToPropsBuilder))},
         {"borderBlockEndColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderBlockEndColorToPropsBuilder))},
         {"borderBlockStartColor",
          value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderBlockStartColorToPropsBuilder))},
         {"borderBottomColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderBottomColorToPropsBuilder))},
         {"borderBottomEndRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderBottomEndRadiusToPropsBuilder))},
         {"borderBottomLeftRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderBottomLeftRadiusToPropsBuilder))},
         {"borderBottomRightRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderBottomRightRadiusToPropsBuilder))},
         {"borderBottomStartRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderBottomStartRadiusToPropsBuilder))},
         {"borderColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderColorToPropsBuilder))},
         {"borderCurve", value<CSSKeyword>("circular", CSSCallback<CSSKeyword>(addBorderCurveToPropsBuilder))},
         {"borderEndColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderEndColorToPropsBuilder))},
         {"borderEndEndRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderEndEndRadiusToPropsBuilder))},
         {"borderEndStartRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderEndStartRadiusToPropsBuilder))},
         {"borderLeftColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderLeftColorToPropsBuilder))},
         {"borderRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSCallback<CSSLength>(addBorderRadiusToPropsBuilder))},
         {"borderRightColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderRightColorToPropsBuilder))},
         {"borderStartColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderStartColorToPropsBuilder))},
         {"borderStartEndRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderStartEndRadiusToPropsBuilder))},
         {"borderStartStartRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderStartStartRadiusToPropsBuilder))},
         {"borderStyle", value<CSSKeyword>("solid", CSSCallback<CSSKeyword>(addBorderStyleToPropsBuilder))},
         {"borderTopColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addBorderTopColorToPropsBuilder))},
         {"borderTopEndRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderTopEndRadiusToPropsBuilder))},
         {"borderTopLeftRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderTopLeftRadiusToPropsBuilder))},
         {"borderTopRightRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderTopRightRadiusToPropsBuilder))},
         {"borderTopStartRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSCallback<CSSLength>(addBorderTopStartRadiusToPropsBuilder))},
         {"outlineColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addOutlineColorToPropsBuilder))},
         {"outlineOffset", value<CSSDouble>(0, CSSCallback<CSSDouble>(addOutlineOffsetToPropsBuilder))},
         {"outlineStyle", value<CSSKeyword>("solid", CSSCallback<CSSKeyword>(addOutlineStyleToPropsBuilder))},
         {"outlineWidth", value<CSSDouble>(0, CSSCallback<CSSDouble>(addOutlineWidthToPropsBuilder))},
         {"opacity", value<CSSDouble>(1, CSSCallback<CSSDouble>(addOpacityToPropsBuilder))},
         {"elevation", value<CSSDouble>(0, CSSCallback<CSSDouble>(addElevationToPropsBuilder))},
         {"pointerEvents", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addPointerEventsToPropsBuilder))},
         {"isolation", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addIsolationToPropsBuilder))},
         {"cursor", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addCursorToPropsBuilder))},
         {"boxShadow",
          array({value<CSSBoxShadow>(CSSBoxShadow(), CSSCallback<CSSBoxShadow>(addBoxShadowToPropsBuilder))})},
         {"mixBlendMode", value<CSSKeyword>("normal", CSSCallback<CSSKeyword>(addMixBlendModeToPropsBuilder))},
     }});

// TEXT, IMAGE and SVG props are not supported by the animation backend.
const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_IOS = {
    {"fontVariant",
     value<CSSDiscreteArray<CSSKeyword>>(std::vector<CSSKeyword>{}, unsupported<CSSDiscreteArray<CSSKeyword>>())},
    {"textDecorationColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(unsupported<CSSColor>()))},
    {"textDecorationStyle", value<CSSKeyword>("solid", unsupported<CSSKeyword>())},
    {"writingDirection", value<CSSKeyword>("auto", unsupported<CSSKeyword>())},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_ANDROID = {
    {"textAlignVertical", value<CSSKeyword>("auto", unsupported<CSSKeyword>())},
    {"verticalAlign", value<CSSKeyword>("auto", unsupported<CSSKeyword>())},
    {"includeFontPadding", value<CSSBoolean>(false, unsupported<CSSBoolean>())},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS = mergeInterpolators(
    {VIEW_INTERPOLATORS,
     TEXT_INTERPOLATORS_IOS,
     TEXT_INTERPOLATORS_ANDROID,
     InterpolatorFactoriesRecord{
         {"color", value<CSSColor>(BLACK, unsupported<CSSColor>())},
         {"fontFamily", value<CSSKeyword>("inherit", unsupported<CSSKeyword>())},
         {"fontSize", value<CSSDouble>(14, unsupported<CSSDouble>())},
         {"fontStyle", value<CSSKeyword>("normal", unsupported<CSSKeyword>())},
         {"fontWeight", value<CSSKeyword>("normal", unsupported<CSSKeyword>())},
         {"letterSpacing", value<CSSDouble>(0, unsupported<CSSDouble>())},
         {"lineHeight", value<CSSDouble>(14, unsupported<CSSDouble>())}, // TODO - should inherit from fontSize
         {"textAlign", value<CSSKeyword>("auto", unsupported<CSSKeyword>())},
         {"textDecorationLine", value<CSSKeyword>("none", unsupported<CSSKeyword>())},
         {"textDecorationThickness", value<CSSDouble>(1, unsupported<CSSDouble>())},
         {"textShadowColor", value<CSSColor>(BLACK, unsupported<CSSColor>())},
         {"textShadowOffset",
          record({
              {"width", value<CSSDouble>(0, unsupported<CSSDouble>())},
              {"height", value<CSSDouble>(0, unsupported<CSSDouble>())},
          })},
         {"textShadowRadius", value<CSSDouble>(0, unsupported<CSSDouble>())},
         {"textTransform", value<CSSKeyword>("none", unsupported<CSSKeyword>())},
         {"userSelect", value<CSSKeyword>("auto", unsupported<CSSKeyword>())},
     }});

const InterpolatorFactoriesRecord IMAGE_INTERPOLATORS = mergeInterpolators(
    {VIEW_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"resizeMode", value<CSSKeyword>("cover", unsupported<CSSKeyword>())},
         {"overlayColor", value<CSSColor>(BLACK, unsupported<CSSColor>())},
         {"tintColor", value<CSSColor>(BLACK, unsupported<CSSColor>())},
     }});

// =================
// SVG INTERPOLATORS
// =================

const InterpolatorFactoriesRecord SVG_COLOR_INTERPOLATORS = {
    {"color", value<SVGBrush>(BLACK, unsupported<SVGBrush>())},
};

const InterpolatorFactoriesRecord SVG_FILL_INTERPOLATORS = {
    {"fill", value<SVGBrush>(BLACK, unsupported<SVGBrush>())},
    {"fillOpacity", value<CSSDouble>(1, unsupported<CSSDouble>())},
    {"fillRule", value<CSSIndex>(0, unsupported<CSSIndex>())},
};

const InterpolatorFactoriesRecord SVG_STROKE_INTERPOLATORS = {
    {"stroke", value<SVGBrush>(BLACK, unsupported<SVGBrush>())},
    {"strokeWidth", value<SVGLength>(1, unsupported<SVGLength>())},
    {"strokeOpacity", value<CSSDouble>(1, unsupported<CSSDouble>())},
    {"strokeDasharray",
     value<SVGStrokeDashArray, CSSKeyword>(SVGStrokeDashArray(), unsupported<SVGStrokeDashArray, CSSKeyword>())},
    {"strokeDashoffset", value<SVGLength>(0, unsupported<SVGLength>())},
    {"strokeLinecap", value<CSSIndex>(0, unsupported<CSSIndex>())},
    {"strokeLinejoin", value<CSSIndex>(0, unsupported<CSSIndex>())},
    {"strokeMiterlimit", value<CSSDouble>(4, unsupported<CSSDouble>())},
    {"vectorEffect", value<CSSIndex>(0, unsupported<CSSIndex>())},
};

const InterpolatorFactoriesRecord SVG_CLIP_INTERPOLATORS = {
    {"clipRule", value<CSSKeyword>("nonzero", unsupported<CSSKeyword>())},
    {"clipPath", value<CSSKeyword>("none", unsupported<CSSKeyword>())},
};

const InterpolatorFactoriesRecord SVG_TRANSFORM_INTERPOLATORS = {
    {"translateX", value<SVGLength>(0, unsupported<SVGLength>())},
    {"translateY", value<SVGLength>(0, unsupported<SVGLength>())},
    {"originX", value<SVGLength>(0, unsupported<SVGLength>())},
    {"originY", value<SVGLength>(0, unsupported<SVGLength>())},
    {"scaleX", value<CSSDouble>(1, unsupported<CSSDouble>())},
    {"scaleY", value<CSSDouble>(1, unsupported<CSSDouble>())},
    {"skewX", value<CSSAngle>(0, unsupported<CSSAngle>())},
    {"skewY", value<CSSAngle>(0, unsupported<CSSAngle>())},
    {"rotation", value<CSSAngle>(0, unsupported<CSSAngle>())},
};

const InterpolatorFactoriesRecord SVG_COMMON_INTERPOLATORS = mergeInterpolators({
    SVG_COLOR_INTERPOLATORS,
    SVG_FILL_INTERPOLATORS,
    SVG_STROKE_INTERPOLATORS,
    InterpolatorFactoriesRecord{{"opacity", value<CSSDouble>(1, unsupported<CSSDouble>())}},
});

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"cx", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"cy", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"r", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
     }});

const InterpolatorFactoriesRecord SVG_ELLIPSE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"cx", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"cy", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"rx", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"ry", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
     }});

const InterpolatorFactoriesRecord SVG_IMAGE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"y", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"width", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"height", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         // TODO: Check why this is not supported in RN-SVG and add support
         // {"align", value<CSSKeyword>("xMidYMid")},
         // {"meetOrSlice", value<CSSIndex>(0)},
     }});

const InterpolatorFactoriesRecord SVG_LINE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x1", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"y1", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"x2", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"y2", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
     }});

const InterpolatorFactoriesRecord SVG_RECT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"y", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"width", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"height", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"rx", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
         {"ry", value<SVGLength, CSSKeyword>(0, unsupported<SVGLength, CSSKeyword>())},
     }});

const InterpolatorFactoriesRecord SVG_PATH_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"d", value<SVGPath>("", unsupported<SVGPath>())},
         {"opacity", value<CSSDouble>(1, unsupported<CSSDouble>())},
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
    registry["RNSVGImage"] = SVG_IMAGE_INTERPOLATORS;
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
