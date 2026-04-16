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

#include <reanimated/CSS/svg/values/CSSLengthArray.h>
#include <reanimated/CSS/svg/values/SVGBrush.h>
#include <reanimated/CSS/svg/values/SVGPath.h>
#include <reanimated/CSS/svg/values/SVGStops.h>
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
#include <reanimated/CSS/utils/interpolatorPropsBuilderImageCallbacks.h>
#include <reanimated/CSS/utils/interpolatorPropsBuilderTextCallbacks.h>

#include <functional>
#include <limits>
#include <string>
#include <vector>

namespace reanimated::css {

namespace {

template <typename... AllowedTypes>
using CSSCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>;

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
    // Transforms
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
    // Filters
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

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_IOS = {
    {"fontVariant",
     value<CSSDiscreteArray<CSSKeyword>>(
         std::vector<CSSKeyword>{},
         CSSCallback<CSSDiscreteArray<CSSKeyword>>(addFontVariantToPropsBuilder))},
    {"textDecorationColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addTextDecorationColorToPropsBuilder))},
    {"textDecorationStyle", value<CSSKeyword>("solid", CSSCallback<CSSKeyword>(addTextDecorationStyleToPropsBuilder))},
    {"writingDirection", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addWritingDirectionToPropsBuilder))},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_ANDROID = {
    {"textAlignVertical", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addTextAlignVerticalToPropsBuilder))},
    {"verticalAlign", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addVerticalAlignToPropsBuilder))},
    {"includeFontPadding", value<CSSBoolean>(false, CSSCallback<CSSBoolean>(addIncludeFontPaddingToPropsBuilder))},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS = mergeInterpolators(
    {VIEW_INTERPOLATORS,
     TEXT_INTERPOLATORS_IOS,
     TEXT_INTERPOLATORS_ANDROID,
     InterpolatorFactoriesRecord{
         {"fontFamily", value<CSSKeyword>("inherit", CSSCallback<CSSKeyword>(addFontFamilyToPropsBuilder))},
         {"fontSize", value<CSSDouble>(14, CSSCallback<CSSDouble>(addFontSizeToPropsBuilder))},
         {"fontStyle", value<CSSKeyword>("normal", CSSCallback<CSSKeyword>(addFontStyleToPropsBuilder))},
         {"fontWeight", value<CSSKeyword>("normal", CSSCallback<CSSKeyword>(addFontWeightToPropsBuilder))},
         {"letterSpacing", value<CSSDouble>(0, CSSCallback<CSSDouble>(addLetterSpacingToPropsBuilder))},
         {"lineHeight",
          value<CSSDouble>(
              14,
              CSSCallback<CSSDouble>(addLineHeightToPropsBuilder))}, // TODO - should inherit from fontSize
         {"textAlign", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addTextAlignToPropsBuilder))},
         {"textDecorationLine",
          value<CSSKeyword>("none", CSSCallback<CSSKeyword>(addTextDecorationLineToPropsBuilder))},
         {"textDecorationThickness",
          value<CSSDouble>(1, CSSCallback<CSSDouble>(addTextDecorationThicknessToPropsBuilder))},
         {"textShadowColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addTextShadowColorToPropsBuilder))},
         {"textShadowOffset",
          record({
              {"width", value<CSSDouble>(0, CSSCallback<CSSDouble>(addTextShadowOffsetWidthToPropsBuilder))},
              {"height", value<CSSDouble>(0, CSSCallback<CSSDouble>(addTextShadowOffsetHeightToPropsBuilder))},
          })},
         {"textShadowRadius", value<CSSDouble>(0, CSSCallback<CSSDouble>(addTextShadowRadiusToPropsBuilder))},
         {"textTransform", value<CSSKeyword>("none", CSSCallback<CSSKeyword>(addTextTransformToPropsBuilder))},
         {"userSelect", value<CSSKeyword>("auto", CSSCallback<CSSKeyword>(addUserSelectToPropsBuilder))},
         {"color", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addTextColorToPropsBuilder))},
     }});

const InterpolatorFactoriesRecord IMAGE_INTERPOLATORS = mergeInterpolators(
    {VIEW_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"resizeMode", value<CSSKeyword>("cover", CSSCallback<CSSKeyword>(addImageResizeModeToPropsBuilder))},
         {"overlayColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addImageOverlayColorToPropsBuilder))},
         {"tintColor", value<CSSColor>(BLACK, CSSCallback<CSSColor>(addImageTintColorToPropsBuilder))},
     }});

const InterpolatorFactoriesRecord STYLE_INTERPOLATORS = mergeInterpolators({TEXT_INTERPOLATORS, IMAGE_INTERPOLATORS});

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
    {"strokeWidth", value<CSSLength>(1, {RelativeTo::Parent, "width"})},
    {"strokeOpacity", value<CSSDouble>(1)},
    {"strokeDasharray", value<SVGStrokeDashArray, CSSKeyword>(SVGStrokeDashArray(), {RelativeTo::Parent, "width"})},
    {"strokeDashoffset", value<CSSLength>(0, {RelativeTo::Parent, "width"})},
    {"strokeLinecap", value<CSSIndex>(0)},
    {"strokeLinejoin", value<CSSIndex>(0)},
    {"strokeMiterlimit", value<CSSDouble>(4)},
    {"vectorEffect", value<CSSIndex>(0)},

    // Clip
    {"clipRule", value<CSSKeyword>("nonzero")},
    {"clipPath", value<CSSKeyword>("none")},

    // Transform
    {"translateX", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"translateY", value<CSSLength>(0, {RelativeTo::Self, "height"})},
    {"originX", value<CSSLength>(0, {RelativeTo::Self, "width"})},
    {"originY", value<CSSLength>(0, {RelativeTo::Self, "height"})},
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
         {"cx", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"cy", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
         {"r", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
     }});

const InterpolatorFactoriesRecord SVG_ELLIPSE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"cx", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"cy", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
         {"rx", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"ry", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
     }});

const InterpolatorFactoriesRecord SVG_IMAGE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"y", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
         {"width", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"height", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
         // TODO: Check why this is not supported in RN-SVG and add support
         // {"align", value<CSSKeyword>("xMidYMid")},
         // {"meetOrSlice", value<CSSIndex>(0)},
     }});

const InterpolatorFactoriesRecord SVG_LINE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x1", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"y1", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
         {"x2", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"y2", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
     }});

const InterpolatorFactoriesRecord SVG_LINEAR_GRADIENT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x1", value<CSSLength, CSSKeyword>("0%", {RelativeTo::Self, "width"})},
         {"x2", value<CSSLength, CSSKeyword>("100%", {RelativeTo::Self, "width"})},
         {"y1", value<CSSLength, CSSKeyword>("0%", {RelativeTo::Self, "height"})},
         {"y2", value<CSSLength, CSSKeyword>("0%", {RelativeTo::Self, "height"})},
         {"gradient", value<SVGStops>(SVGStops())},
         {"gradientUnits", value<CSSIndex>(0)},
         // TODO: Implement 'gradientTransform'
         // {"gradientTransform", value<CSSKeyword>("")},
     }});

const InterpolatorFactoriesRecord SVG_RECT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"y", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
         {"width", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         {"height", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "height"})},
         {"rx", value<CSSLength, CSSKeyword>(0, {RelativeTo::Self, "width"})},
         {"ry", value<CSSLength, CSSKeyword>(0, {RelativeTo::Self, "height"})},
     }});

const InterpolatorFactoriesRecord SVG_PATH_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"d", value<SVGPath>("")},
         {"opacity", value<CSSDouble>(1)},
     }});

const InterpolatorFactoriesRecord SVG_PATTERN_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<CSSLength>(0, {RelativeTo::Parent, "width"})},
         {"y", value<CSSLength>(0, {RelativeTo::Parent, "height"})},
         {"width", value<CSSLength>(0, {RelativeTo::Parent, "width"})},
         {"height", value<CSSLength>(0, {RelativeTo::Parent, "height"})},
         {"patternUnits", value<CSSIndex>(0)},
         {"patternContentUnits", value<CSSIndex>(0)},
     }});

const InterpolatorFactoriesRecord SVG_RADIAL_GRADIENT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"r", value<CSSLength, CSSKeyword>("50%", {RelativeTo::Self, "width"})},
         {"fx", value<CSSLength, CSSKeyword>("50%", {RelativeTo::Self, "width"})},
         {"fy", value<CSSLength, CSSKeyword>("50%", {RelativeTo::Self, "height"})},
         {"rx", value<CSSLength, CSSKeyword>("50%", {RelativeTo::Self, "width"})},
         {"ry", value<CSSLength, CSSKeyword>("50%", {RelativeTo::Self, "height"})},
         {"cx", value<CSSLength, CSSKeyword>("50%", {RelativeTo::Self, "width"})},
         {"cy", value<CSSLength, CSSKeyword>("50%", {RelativeTo::Self, "height"})},
         {"gradient", value<SVGStops>(SVGStops())},
         {"gradientUnits", value<CSSIndex>(0)},
         // TODO: Implement 'gradientTransform'
         // {"gradientTransform", value<CSSKeyword>("")},
     }});

const InterpolatorFactoriesRecord SVG_TEXT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<CSSLengthArray>(CSSLengthArray(), {RelativeTo::Parent, "width"})},
         {"y", value<CSSLengthArray>(CSSLengthArray(), {RelativeTo::Parent, "height"})},
         {"dx", value<CSSLengthArray>(CSSLengthArray(), {RelativeTo::Parent, "width"})},
         {"dy", value<CSSLengthArray>(CSSLengthArray(), {RelativeTo::Parent, "height"})},
         {"rotate", value<CSSLengthArray>(CSSLengthArray(), {RelativeTo::Parent, "width"})},
         // TODO: Implement when supported by RNSVG
         //  {"textLength", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"})},
         //  {"lengthAdjust", value<CSSKeyword>("spacing")},
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
    registry["RNSVGPattern"] = SVG_PATTERN_INTERPOLATORS;
    registry["RNSVGRect"] = SVG_RECT_INTERPOLATORS;
    registry["RNSVGRadialGradient"] = SVG_RADIAL_GRADIENT_INTERPOLATORS;
    registry["RNSVGText"] = SVG_TEXT_INTERPOLATORS;
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
