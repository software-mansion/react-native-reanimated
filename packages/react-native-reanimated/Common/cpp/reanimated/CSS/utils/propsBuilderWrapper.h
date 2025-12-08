#pragma once

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>

namespace reanimated::css {
void addToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const folly::dynamic &interpolatedValue,
    const std::string &propertyName);

void animationMutationsFromDynamic(AnimationMutations &mutations, UpdatesBatch &updatesBatch);
} // namespace reanimated::css
