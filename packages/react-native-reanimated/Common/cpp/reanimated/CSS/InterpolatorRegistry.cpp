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
#include <reanimated/CSS/utils/propsBuilderWrapper.h>

#include <limits>
#include <string>
#include <vector>

namespace reanimated::css {

namespace {

using CSSLengthKeywordCallback = std::function<void(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
    const CSSValueVariant<CSSLength, CSSKeyword> &)>;

using CSSLengthCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSLength> &)>;

using CSSDoubleCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSDouble> &)>;

using CSSColorCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSColor> &)>;

using CSSKeywordCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSKeyword> &)>;

using CSSDoubleKeywordCallback = std::function<void(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
    const CSSValueVariant<CSSDouble, CSSKeyword> &)>;

using CSSDisplayCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSDisplay> &)>;

using CSSIntegerCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSInteger> &)>;

using CSSBooleanCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSBoolean> &)>;

using CSSAngleCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSAngle> &)>;

using CSSBoxShadowCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSBoxShadow> &)>;

using CSSDiscreteKeywordArrayCallback = std::function<void(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
    const CSSValueVariant<CSSDiscreteArray<CSSKeyword>> &)>;

using SVGBrushCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<SVGBrush> &)>;

using SVGLengthCallback = std::function<
    void(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<SVGLength> &)>;

using SVGLengthKeywordCallback = std::function<void(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
    const CSSValueVariant<SVGLength, CSSKeyword> &)>;

using SVGStrokeDashArrayKeywordCallback = std::function<void(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
    const CSSValueVariant<SVGStrokeDashArray, CSSKeyword> &)>;

CSSLengthKeywordCallback getCSSLengthKeywordCallback(std::string propName) {
  return [propName](
             const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
             const CSSValueVariant<CSSLength, CSSKeyword> &value) {
    const auto storage = value.getStorage();

    std::visit(
        [&](const auto &active_value) {
          using T = std::decay_t<decltype(active_value)>;

          if constexpr (std::is_same_v<T, CSSLength>) {
            const CSSLength &cssLength = active_value;
            // double value = length.value;

            // printf("getCSSLengthKeywordCallback: propName %s, value %f \n", propName.c_str(), value);

          } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          }
        },
        storage);
  };
}

CSSLengthCallback getCSSLengthCallback(std::string propName) {
  return
      [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSLength> &) {
      };
}

CSSDoubleCallback getCSSDoubleCallback(std::string propName) {
  return
      [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSDouble> &) {
      };
}

CSSColorCallback getCSSColorCallback(std::string propName) {
  return [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSColor> &) {

  };
}

CSSKeywordCallback getCSSKeywordCallback(std::string propName) {
  return
      [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSKeyword> &) {
      };
}

CSSDoubleKeywordCallback getCSSDoubleKeywordCallback(std::string propName) {
  return [propName](
             const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
             const CSSValueVariant<CSSDouble, CSSKeyword> &) {
  };
}

CSSDisplayCallback getCSSDisplayCallback(std::string propName) {
  return
      [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSDisplay> &) {
      };
}

CSSIntegerCallback getCSSIntegerCallback(std::string propName) {
  return
      [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSInteger> &) {
      };
}

CSSBooleanCallback getCSSBooleanCallback(std::string propName) {
  return
      [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSBoolean> &) {
      };
}

CSSAngleCallback getCSSAngleCallback(std::string propName) {
  return [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSAngle> &) {
  };
}

CSSBoxShadowCallback getCSSBoxShadowCallback(std::string propName) {
  return [propName](
             const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<CSSBoxShadow> &) {
  };
}

CSSDiscreteKeywordArrayCallback getCSSDiscreteKeywordArrayCallback(std::string propName) {
  return [propName](
             const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
             const CSSValueVariant<CSSDiscreteArray<CSSKeyword>> &) {
  };
}

SVGBrushCallback getSVGBrushCallback(std::string propName) {
  return [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<SVGBrush> &) {
  };
}

SVGLengthCallback getSVGLengthCallback(std::string propName) {
  return
      [propName](const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &, const CSSValueVariant<SVGLength> &) {
      };
}

SVGLengthKeywordCallback getSVGLengthKeywordCallback(std::string propName) {
  return [propName](
             const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
             const CSSValueVariant<SVGLength, CSSKeyword> &) {
  };
}

SVGStrokeDashArrayKeywordCallback getSVGStrokeDashArrayKeywordCallback(std::string propName) {
  return [propName](
             const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &,
             const CSSValueVariant<SVGStrokeDashArray, CSSKeyword> &) {
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
    {"alignContent", value<CSSKeyword>("flex-start", getCSSKeywordCallback("alignContent"))},
    {"alignItems", value<CSSKeyword>("stretch", getCSSKeywordCallback("alignItems"))},
    {"alignSelf", value<CSSKeyword>("auto", getCSSKeywordCallback("alignSelf"))},
    {"aspectRatio", value<CSSDouble, CSSKeyword>("auto", getCSSDoubleKeywordCallback("aspectRatio"))},
    {"borderBottomWidth", value<CSSDouble>(0, getCSSDoubleCallback("borderBottomWidth"))},
    {"borderEndWidth", value<CSSDouble>(0, getCSSDoubleCallback("borderEndWidth"))},
    {"borderLeftWidth", value<CSSDouble>(0, getCSSDoubleCallback("borderLeftWidth"))},
    {"borderRightWidth", value<CSSDouble>(0, getCSSDoubleCallback("borderRightWidth"))},
    {"borderStartWidth", value<CSSDouble>(0, getCSSDoubleCallback("borderStartWidth"))},
    {"borderTopWidth", value<CSSDouble>(0, getCSSDoubleCallback("borderTopWidth"))},
    {"borderWidth", value<CSSDouble>(0, getCSSDoubleCallback("borderWidth"))},
    {"bottom",
     value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"}, getCSSLengthKeywordCallback("bottom"))},
    {"boxSizing", value<CSSKeyword>("border-box", getCSSKeywordCallback("border-box"))},
    {"display", value<CSSDisplay>("flex", getCSSDisplayCallback("display"))},
    {"end", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("end"))},
    {"flex", value<CSSDouble>(0, getCSSDoubleCallback("flex"))},
    {"flexBasis",
     value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("flexBasis"))},
    {"flexDirection", value<CSSKeyword>("column", getCSSKeywordCallback("column"))},
    {"rowGap", value<CSSLength>(0, {RelativeTo::Self, "height"}, CSSLengthCallback(getCSSLengthCallback("rowGap")))},
    {"columnGap",
     value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(getCSSLengthCallback("columnGap")))},
    {"flexGrow", value<CSSDouble>(0, getCSSDoubleCallback("flexGrow"))},
    {"flexShrink", value<CSSDouble>(0, getCSSDoubleCallback("flexShrink"))},
    {"flexWrap", value<CSSKeyword>("no-wrap", getCSSKeywordCallback("no-wrap"))},
    {"height",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "height"},
         CSSLengthKeywordCallback(addHeightToPropsBuilder))},
    {"justifyContent", value<CSSKeyword>("flex-start", getCSSKeywordCallback("flex-start"))},
    {"left", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("left"))},
    {"margin", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("margin"))},
    {"marginBottom",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("marginBottom"))},
    {"marginEnd",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("marginEnd"))},
    {"marginHorizontal",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("marginHorizontal"))},
    {"marginLeft",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("marginLeft"))},
    {"marginRight",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("marginRight"))},
    {"marginStart",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("marginStart"))},
    {"marginTop",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("marginTop"))},
    {"marginVertical",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("marginVertical"))},
    {"maxHeight",
     value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"}, getCSSLengthKeywordCallback("maxHeight"))},
    {"maxWidth",
     value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("maxWidth"))},
    {"minHeight",
     value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"}, getCSSLengthKeywordCallback("minHeight"))},
    {"minWidth",
     value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("minWidth"))},
    {"overflow", value<CSSKeyword>("visible", getCSSKeywordCallback("visible"))},
    {"padding", value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("padding"))},
    {"paddingBottom",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("paddingBottom"))},
    {"paddingEnd",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("paddingEnd"))},
    {"paddingHorizontal",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("paddingHorizontal"))},
    {"paddingLeft",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("paddingLeft"))},
    {"paddingRight",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("paddingRight"))},
    {"paddingStart",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("paddingStart"))},
    {"paddingTop",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("paddingTop"))},
    {"paddingVertical",
     value<CSSLength, CSSKeyword>(0, {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("paddingVertical"))},
    {"position", value<CSSKeyword>("relative", getCSSKeywordCallback("relative"))},
    {"right",
     value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("right"))},
    {"start",
     value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "width"}, getCSSLengthKeywordCallback("start"))},
    {"top", value<CSSLength, CSSKeyword>("auto", {RelativeTo::Parent, "height"}, getCSSLengthKeywordCallback("top"))},
    {"width",
     value<CSSLength, CSSKeyword>(
         "auto",
         {RelativeTo::Parent, "width"},
         CSSLengthKeywordCallback(addWidthToPropsBuilder))},
    {"zIndex", value<CSSInteger>(0, getCSSIntegerCallback("zIndex"))},
    {"direction", value<CSSKeyword>("inherit", getCSSKeywordCallback("inherit"))}};

const InterpolatorFactoriesRecord SHADOW_INTERPOLATORS_IOS = {
    {"shadowColor", value<CSSColor>(BLACK, getCSSColorCallback("shadowColor"))},
    {"shadowOffset",
     record({
         {"width", value<CSSDouble>(0, getCSSDoubleCallback("shadowOffset.width"))},
         {"height", value<CSSDouble>(0, getCSSDoubleCallback("shadowOffset.height"))},
     })},
    {"shadowRadius", value<CSSDouble>(0, getCSSDoubleCallback("shadowRaius"))},
    {"shadowOpacity", value<CSSDouble>(1, getCSSDoubleCallback("shadowOpacity"))}};

const InterpolatorFactoriesRecord TRANSFORMS_INTERPOLATORS = {
    {"transformOrigin",
     array(
         {value<CSSLength>("50%", {RelativeTo::Self, "width"}, getCSSLengthKeywordCallback("transformOrigin")),
          value<CSSLength>("50%", {RelativeTo::Self, "height"}, getCSSLengthKeywordCallback("transformOrigin")),
          value<CSSDouble>(0, getCSSDoubleCallback("transformOrigin"))})},
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
         {"backfaceVisibility", value<CSSKeyword>("visible", getCSSKeywordCallback("backfaceVisibility"))},
         {"backgroundColor", value<CSSColor>(TRANSPARENT, CSSColorCallback(addBackgroundColorToPropsBuilder))},
         {"borderBlockColor", value<CSSColor>(BLACK, getCSSColorCallback("borderBlockColor"))},
         {"borderBlockEndColor", value<CSSColor>(BLACK, getCSSColorCallback("borderBlockEndColor"))},
         {"borderBlockStartColor", value<CSSColor>(BLACK, getCSSColorCallback("borderBlockStartColor"))},
         {"borderBottomColor", value<CSSColor>(BLACK, getCSSColorCallback("borderBottomColor"))},
         {"borderBottomEndRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderBottomEndRadiusToPropsBuilder))},
         {"borderBottomLeftRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderBottomLeftRadiusToPropsBuilder))},
         {"borderBottomRightRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSLengthCallback(addBorderBottomRightRadiusToPropsBuilder))},
         {"borderBottomStartRadius",
          value<CSSLength>(
              0,
              {RelativeTo::Self, "width"},
              CSSLengthCallback(addBorderBottomStartRadiusToPropsBuilder))},
         {"borderColor", value<CSSColor>(BLACK, getCSSColorCallback("borderColor"))},
         {"borderCurve", value<CSSKeyword>("circular", getCSSKeywordCallback("borderCurve"))},
         {"borderEndColor", value<CSSColor>(BLACK, getCSSColorCallback("borderEndColor"))},
         {"borderEndEndRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderEndEndRadiusToPropsBuilder))},
         {"borderEndStartRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderEndStartRadiusToPropsBuilder))},
         {"borderLeftColor", value<CSSColor>(BLACK, getCSSColorCallback("borderLeftColor"))},
         {"borderRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderRadiusToPropsBuilder))},
         {"borderRightColor", value<CSSColor>(BLACK, getCSSColorCallback("borderRightColor"))},
         {"borderStartColor", value<CSSColor>(BLACK, getCSSColorCallback("borderStartColor"))},
         {"borderStartEndRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderStartEndRadiusToPropsBuilder))},
         {"borderStartStartRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderStartStartRadiusToPropsBuilder))},
         {"borderStyle", value<CSSKeyword>("solid", getCSSKeywordCallback("borderStyle"))},
         {"borderTopColor", value<CSSColor>(BLACK, getCSSColorCallback("borderTopColor"))},
         {"borderTopEndRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderTopEndRadiusToPropsBuilder))},
         {"borderTopLeftRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderTopLeftRadiusToPropsBuilder))},
         {"borderTopRightRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderTopRightRadiusToPropsBuilder))},
         {"borderTopStartRadius",
          value<CSSLength>(0, {RelativeTo::Self, "width"}, CSSLengthCallback(addBorderTopStartRadiusToPropsBuilder))},
         {"outlineColor", value<CSSColor>(BLACK, getCSSColorCallback("outlineColor"))},
         {"outlineOffset", value<CSSDouble>(0, getCSSDoubleCallback("outlineOffset"))},
         {"outlineStyle", value<CSSKeyword>("solid", getCSSKeywordCallback("outlineStyle"))},
         {"outlineWidth", value<CSSDouble>(0, getCSSDoubleCallback("outlineWidth"))},
         {"opacity", value<CSSDouble>(1, CSSDoubleCallback(addOpacityToPropsBuilder))},
         {"elevation", value<CSSDouble>(0, getCSSDoubleCallback("elevation"))},
         {"pointerEvents", value<CSSKeyword>("auto", getCSSKeywordCallback("auto"))},
         {"isolation", value<CSSKeyword>("auto", getCSSKeywordCallback("auto"))},
         {"cursor", value<CSSKeyword>("auto", getCSSKeywordCallback("auto"))},
         {"boxShadow", array({value<CSSBoxShadow>(CSSBoxShadow(), getCSSBoxShadowCallback("boxShadow"))})},
         {"mixBlendMode", value<CSSKeyword>("normal", getCSSKeywordCallback("normal"))},
     }});

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_IOS = {
    {"fontVariant",
     value<CSSDiscreteArray<CSSKeyword>>(std::vector<CSSKeyword>{}, getCSSDiscreteKeywordArrayCallback("fontVariant"))},
    {"textDecorationColor", value<CSSColor>(BLACK, getCSSColorCallback("textDecorationColor"))},
    {"textDecorationStyle", value<CSSKeyword>("solid", getCSSKeywordCallback("textDecorationStyle"))},
    {"writingDirection", value<CSSKeyword>("auto", getCSSKeywordCallback("writingDirection"))},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS_ANDROID = {
    {"textAlignVertical", value<CSSKeyword>("auto", getCSSKeywordCallback("textAlignVertical"))},
    {"verticalAlign", value<CSSKeyword>("auto", getCSSKeywordCallback("verticalAlign"))},
    {"includeFontPadding", value<CSSBoolean>(false, getCSSBooleanCallback("includeFontPadding"))},
};

const InterpolatorFactoriesRecord TEXT_INTERPOLATORS = mergeInterpolators(
    {VIEW_INTERPOLATORS,
     TEXT_INTERPOLATORS_IOS,
     TEXT_INTERPOLATORS_ANDROID,
     InterpolatorFactoriesRecord{
         {"color", value<CSSColor>(BLACK, getCSSColorCallback("color"))},
         {"fontFamily", value<CSSKeyword>("inherit", getCSSKeywordCallback("fontFamily"))},
         {"fontSize", value<CSSDouble>(14, getCSSDoubleCallback("fontSize"))},
         {"fontStyle", value<CSSKeyword>("normal", getCSSKeywordCallback("fontStyle"))},
         {"fontWeight", value<CSSKeyword>("normal", getCSSKeywordCallback("fontWeight"))},
         {"letterSpacing", value<CSSDouble>(0, getCSSDoubleCallback("letterSpacing"))},
         {"lineHeight",
          value<CSSDouble>(14, getCSSDoubleCallback("lineHeight"))}, // TODO - should inherit from fontSize
         {"textAlign", value<CSSKeyword>("auto", getCSSKeywordCallback("textAlign"))},
         {"textDecorationLine", value<CSSKeyword>("none", getCSSKeywordCallback("textDecorationLine"))},
         {"textDecorationThickness", value<CSSDouble>(1, getCSSDoubleCallback("textDecorationThickness"))},
         {"textShadowColor", value<CSSColor>(BLACK, getCSSColorCallback("textShadowColor"))},
         {"textShadowOffset",
          record({
              {"width", value<CSSDouble>(0, getCSSDoubleCallback("textShadowOffset.width"))},
              {"height", value<CSSDouble>(0, getCSSDoubleCallback("textShadowOffset.height"))},
          })},
         {"textShadowRadius", value<CSSDouble>(0, getCSSDoubleCallback("textShadowRadius"))},
         {"textTransform", value<CSSKeyword>("none", getCSSKeywordCallback("textTransform"))},
         {"userSelect", value<CSSKeyword>("auto", getCSSKeywordCallback("userSelect"))},
     }});

const InterpolatorFactoriesRecord IMAGE_INTERPOLATORS = mergeInterpolators(
    {VIEW_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"resizeMode", value<CSSKeyword>("cover", getCSSKeywordCallback("resizeMode"))},
         {"overlayColor", value<CSSColor>(BLACK, getCSSColorCallback("overlayColor"))},
         {"tintColor", value<CSSColor>(BLACK, getCSSColorCallback("tintColor"))},
     }});

// =================
// SVG INTERPOLATORS
// =================

const InterpolatorFactoriesRecord SVG_COLOR_INTERPOLATORS = {
    {"color", value<SVGBrush>(BLACK, getSVGBrushCallback("svg.color"))},
};

const InterpolatorFactoriesRecord SVG_FILL_INTERPOLATORS = {
    {"fill", value<SVGBrush>(BLACK, getSVGBrushCallback("svg.fill"))},
    {"fillOpacity", value<CSSDouble>(1, getCSSDoubleCallback("svg.fillOpacity"))},
    {"fillRule", value<CSSInteger>(0, getCSSIntegerCallback("svg.fillRule"))},
};

const InterpolatorFactoriesRecord SVG_STROKE_INTERPOLATORS = {
    {"stroke", value<SVGBrush>(BLACK, getSVGBrushCallback("svg.stroke"))},
    {"strokeWidth", value<SVGLength>(1, getSVGLengthCallback("svg.strokeWidth"))},
    {"strokeOpacity", value<CSSDouble>(1, getCSSDoubleCallback("svg.strokeOpacity"))},
    {"strokeDasharray",
     value<SVGStrokeDashArray, CSSKeyword>(
         SVGStrokeDashArray(),
         getSVGStrokeDashArrayKeywordCallback("svg.strokeDasharray"))},
    {"strokeDashoffset", value<SVGLength>(0, getSVGLengthCallback("svg.strokeDashoffset"))},
    {"strokeLinecap", value<CSSInteger>(0, getCSSIntegerCallback("svg.strokeLinecap"))},
    {"strokeLinejoin", value<CSSInteger>(0, getCSSIntegerCallback("svg.strokeLinejoin"))},
    {"strokeMiterlimit", value<CSSDouble>(4, getCSSDoubleCallback("svg.strokeMiterlimit"))},
    {"vectorEffect", value<CSSInteger>(0, getCSSIntegerCallback("svg.vectorEffect"))},
};

const InterpolatorFactoriesRecord SVG_CLIP_INTERPOLATORS = {
    {"clipRule", value<CSSKeyword>("nonzero", getCSSKeywordCallback("svg.clipRule"))},
    {"clipPath", value<CSSKeyword>("none", getCSSKeywordCallback("svg.clipPath"))},
};

const InterpolatorFactoriesRecord SVG_TRANSFORM_INTERPOLATORS = {
    {"translateX", value<SVGLength>(0, getSVGLengthCallback("svg.translateX"))},
    {"translateY", value<SVGLength>(0, getSVGLengthCallback("svg.translateY"))},
    {"originX", value<SVGLength>(0, getSVGLengthCallback("svg.originX"))},
    {"originY", value<SVGLength>(0, getSVGLengthCallback("svg.originY"))},
    {"scaleX", value<CSSDouble>(1, getCSSDoubleCallback("svg.scaleX"))},
    {"scaleY", value<CSSDouble>(1, getCSSDoubleCallback("svg.scaleY"))},
    {"skewX", value<CSSAngle>(0, getCSSAngleCallback("svg.skewX"))},
    {"skewY", value<CSSAngle>(0, getCSSAngleCallback("svg.skewY"))},
    {"rotation", value<CSSAngle>(0, getCSSAngleCallback("svg.rotation"))},
};

const InterpolatorFactoriesRecord SVG_COMMON_INTERPOLATORS = mergeInterpolators({
    SVG_COLOR_INTERPOLATORS,
    SVG_FILL_INTERPOLATORS,
    SVG_STROKE_INTERPOLATORS,
    InterpolatorFactoriesRecord{{"opacity", value<CSSDouble>(1, getCSSDoubleCallback("svg.opacity"))}},
});

const InterpolatorFactoriesRecord SVG_CIRCLE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"cx", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.circle.cx"))},
         {"cy", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.circle.cy"))},
         {"r", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.circle.r"))},
     }});

const InterpolatorFactoriesRecord SVG_ELLIPSE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"cx", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.ellipse.cx"))},
         {"cy", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.ellipse.cy"))},
         {"rx", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.ellipse.rx"))},
         {"ry", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.ellipse.ry"))},
     }});

const InterpolatorFactoriesRecord SVG_LINE_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x1", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.line.x1"))},
         {"y1", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.line.y1"))},
         {"x2", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.line.x2"))},
         {"y2", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.line.y2"))},
     }});

const InterpolatorFactoriesRecord SVG_RECT_INTERPOLATORS = mergeInterpolators(
    {SVG_COMMON_INTERPOLATORS,
     InterpolatorFactoriesRecord{
         {"x", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.rect.x"))},
         {"y", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.rect.y"))},
         {"width", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.rect.width"))},
         {"height", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.rect.height"))},
         {"rx", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.rect.rx"))},
         {"ry", value<SVGLength, CSSKeyword>(0, getSVGLengthKeywordCallback("svg.rect.ry"))},
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
