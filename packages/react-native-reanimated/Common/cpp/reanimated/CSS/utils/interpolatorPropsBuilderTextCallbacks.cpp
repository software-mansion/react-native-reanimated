#include <reanimated/CSS/utils/interpolatorPropsBuilderTextCallbacks.h>

#include <react/renderer/core/RawProps.h>

#include <folly/dynamic.h>

#include <utility>

namespace reanimated::css {

namespace {

static folly::dynamic mergeDynamicObjects(folly::dynamic base, const folly::dynamic &updates) {
  if (!base.isObject() || !updates.isObject()) {
    return updates;
  }

  for (const auto &key : updates.keys()) {
    auto &updateValue = updates.at(key);

    if (base.count(key) > 0) {
      auto &existingValue = base.at(key);
      if (existingValue.isObject() && updateValue.isObject()) {
        existingValue = mergeDynamicObjects(existingValue, updateValue);
        continue;
      }
    }

    base[key] = updateValue;
  }

  return base;
}

static void storeDynamicMerged(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    folly::dynamic newProps) {
  if (propsBuilder->rawProps) {
    const auto existing = propsBuilder->rawProps->toDynamic();
    newProps = mergeDynamicObjects(existing, newProps);
  }

  folly::dynamic propsToStore = std::move(newProps);
  propsBuilder->storeDynamic(propsToStore);
}

template <typename... AllowedTypes>
static void storeCssValueVariantAsRawProp(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const char *propKey,
    const CSSValueVariant<AllowedTypes...> &value) {
  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &cssValue) {
        folly::dynamic dynamicValue = cssValue.toDynamic();
        folly::dynamic dynamicUpdate = folly::dynamic::object(propKey, std::move(dynamicValue));
        storeDynamicMerged(propsBuilder, std::move(dynamicUpdate));
      },
      storage);
}

template <typename... AllowedTypes>
static void storeCssValueVariantAsNestedRawProp(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const char *parentKey,
    const char *childKey,
    const CSSValueVariant<AllowedTypes...> &value) {
  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &cssValue) {
        folly::dynamic dynamicValue = cssValue.toDynamic();
        folly::dynamic nested = folly::dynamic::object(childKey, std::move(dynamicValue));
        folly::dynamic dynamicUpdate = folly::dynamic::object(parentKey, std::move(nested));
        storeDynamicMerged(propsBuilder, std::move(dynamicUpdate));
      },
      storage);
}

} // namespace

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
