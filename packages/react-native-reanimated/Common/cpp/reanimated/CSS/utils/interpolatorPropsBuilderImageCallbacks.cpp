#include <reanimated/CSS/utils/animationUpdatesBatchUtils.h>
#include <reanimated/CSS/utils/interpolatorPropsBuilderImageCallbacks.h>

namespace reanimated::css {

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
