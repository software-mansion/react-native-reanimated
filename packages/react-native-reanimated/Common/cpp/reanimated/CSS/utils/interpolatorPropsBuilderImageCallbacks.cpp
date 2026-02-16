#include <reanimated/CSS/utils/interpolatorPropsBuilderImageCallbacks.h>

#include <react/renderer/core/RawProps.h>

#include <folly/dynamic.h>

#include <utility>

namespace reanimated::css {

namespace {

static void storeDynamicMerged(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    folly::dynamic newProps) {
  if (propsBuilder->rawProps) {
    auto existing = propsBuilder->rawProps->toDynamic();
    if (existing.isObject() && newProps.isObject()) {
      newProps = folly::dynamic::merge(existing, newProps);
    }
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

} // namespace

void addImageResizeModeToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "resizeMode", value);
}

void addImageOverlayColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "overlayColor", value);
}

void addImageTintColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  storeCssValueVariantAsRawProp(propsBuilder, "tintColor", value);
}

} // namespace reanimated::css
