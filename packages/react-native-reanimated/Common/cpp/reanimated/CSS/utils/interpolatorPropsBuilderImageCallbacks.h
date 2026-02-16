#pragma once

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>

#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSValueVariant.h>

namespace reanimated::css {

// Callbacks for image-related props that are stored via `rawProps`.

void addImageResizeModeToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value);

void addImageOverlayColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value);

void addImageTintColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value);

} // namespace reanimated::css
