#include <reanimated/CSS/utils/animationUpdatesBatchUtils.h>
#include <reanimated/CSS/utils/interpolatorPropsBuilderSVGCallbacks.h>

#include <reanimated/CSS/svg/values/SVGStops.h>

namespace reanimated::css {

void addSvgColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGBrush> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "color", value);
}

void addSvgFillToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGBrush> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fill", value);
}

void addSvgFillOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fillOpacity", value);
}

void addSvgFillRuleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fillRule", value);
}

void addSvgStrokeToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGBrush> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "stroke", value);
}

void addSvgStrokeWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "strokeWidth", value);
}

void addSvgStrokeOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "strokeOpacity", value);
}

void addSvgStrokeDasharrayToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGStrokeDashArray, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "strokeDasharray", value);
}

void addSvgStrokeDashoffsetToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "strokeDashoffset", value);
}

void addSvgStrokeLinecapToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "strokeLinecap", value);
}

void addSvgStrokeLinejoinToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "strokeLinejoin", value);
}

void addSvgStrokeMiterlimitToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "strokeMiterlimit", value);
}

void addSvgVectorEffectToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "vectorEffect", value);
}

void addSvgClipRuleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "clipRule", value);
}

void addSvgClipPathToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "clipPath", value);
}

void addSvgTranslateXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "translateX", value);
}

void addSvgTranslateYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "translateY", value);
}

void addSvgOriginXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "originX", value);
}

void addSvgOriginYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "originY", value);
}

void addSvgScaleXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "scaleX", value);
}

void addSvgScaleYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "scaleY", value);
}

void addSvgSkewXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSAngle> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "skewX", value);
}

void addSvgSkewYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSAngle> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "skewY", value);
}

void addSvgRotationToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSAngle> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "rotation", value);
}

void addSvgOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "opacity", value);
}

void addSvgCxToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "cx", value);
}

void addSvgCyToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "cy", value);
}

void addSvgRToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "r", value);
}

void addSvgRxToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "rx", value);
}

void addSvgRyToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "ry", value);
}

void addSvgXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "x", value);
}

void addSvgYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "y", value);
}

void addSvgWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "width", value);
}

void addSvgHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "height", value);
}

void addSvgX1ToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "x1", value);
}

void addSvgY1ToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "y1", value);
}

void addSvgX2ToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "x2", value);
}

void addSvgY2ToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "y2", value);
}

void addSvgPathDToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGPath> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "d", value);
}

void addSvgRectRxToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "rx", value);
}

void addSvgRectRyToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "ry", value);
}

void addSvgFxToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fx", value);
}

void addSvgFyToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGLength, CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fy", value);
}

void addSvgGradientToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<SVGStops> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "gradient", value);
}

void addSvgGradientUnitsToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSIndex> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "gradientUnits", value);
}

} // namespace reanimated::css
