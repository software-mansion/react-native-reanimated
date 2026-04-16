#include <reanimated/CSS/utils/animationUpdatesBatchUtils.h>
#include <reanimated/CSS/utils/interpolatorPropsBuilderTextCallbacks.h>

namespace reanimated::css {

void addFontVariantToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDiscreteArray<CSSKeyword>> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fontVariant", value);
}

void addTextDecorationColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textDecorationColor", value);
}

void addTextDecorationStyleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textDecorationStyle", value);
}

void addWritingDirectionToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "writingDirection", value);
}

void addTextAlignVerticalToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textAlignVertical", value);
}

void addVerticalAlignToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "verticalAlign", value);
}

void addIncludeFontPaddingToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSBoolean> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "includeFontPadding", value);
}

void addTextColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "color", value);
}

void addFontFamilyToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fontFamily", value);
}

void addFontSizeToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fontSize", value);
}

void addFontStyleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fontStyle", value);
}

void addFontWeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "fontWeight", value);
}

void addLetterSpacingToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "letterSpacing", value);
}

void addLineHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "lineHeight", value);
}

void addTextAlignToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textAlign", value);
}

void addTextDecorationLineToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textDecorationLine", value);
}

void addTextDecorationThicknessToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textDecorationThickness", value);
}

void addTextShadowColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textShadowColor", value);
}

void addTextShadowOffsetWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsNestedRawProp(propsBuilder, "textShadowOffset", "width", value);
}

void addTextShadowOffsetHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsNestedRawProp(propsBuilder, "textShadowOffset", "height", value);
}

void addTextShadowRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textShadowRadius", value);
}

void addTextTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "textTransform", value);
}

void addUserSelectToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "userSelect", value);
}

} // namespace reanimated::css
