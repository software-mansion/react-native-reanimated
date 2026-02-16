#pragma once

#include <reanimated/CSS/utils/propNameFromString.h>
#include <reanimated/CSS/utils/propsLayoutFilter.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>
#include <react/renderer/core/RawProps.h>

#include <folly/dynamic.h>

#include <memory>

namespace reanimated::css {

inline bool hasLayoutProps(const folly::dynamic &props) {
  for (const auto &key : props.keys()) {
    const auto propName = propNameFromString(key.asString());
    if (propName.has_value() && isLayoutProp(propName.value())) {
      return true;
    }
  }
  return false;
}

inline void mergeDynamicIntoMutations(
    facebook::react::AnimationMutations &mutations,
    const std::shared_ptr<const facebook::react::ShadowNode> &node,
    folly::dynamic props,
    bool hasLayoutUpdates) {
  const auto tag = node->getTag();
  for (auto &mutation : mutations.batch) {
    if (mutation.tag != tag) {
      continue;
    }

    if (mutation.props.rawProps) {
      auto mergedDynamic = folly::dynamic::merge(mutation.props.rawProps->toDynamic(), props);
      mutation.props.rawProps = std::make_unique<facebook::react::RawProps>(std::move(mergedDynamic));
    } else {
      mutation.props.rawProps = std::make_unique<facebook::react::RawProps>(props);
    }

    mutation.hasLayoutUpdates = mutation.hasLayoutUpdates || hasLayoutUpdates;
    return;
  }

  facebook::react::AnimatedPropsBuilder builder;
  builder.storeDynamic(props);
  mutations.batch.push_back(facebook::react::AnimationMutation{
      tag,
      node->getFamilyShared(),
      builder.get(),
      hasLayoutUpdates,
  });
}

inline void mergeAnimationUpdatesBatch(facebook::react::AnimationMutations &mutations, UpdatesBatch &updatesBatch) {
  for (auto &[node, dynamic] : updatesBatch) {
    mergeDynamicIntoMutations(mutations, node, dynamic, hasLayoutProps(dynamic));
  }
}

inline void addNonLayoutPropsFromDynamic(facebook::react::AnimationMutations &mutations, UpdatesBatch &updatesBatch) {
  if (!shouldFilterNonLayoutProps()) {
    return;
  }

  for (auto &[node, dynamic] : updatesBatch) {
    folly::dynamic nonLayoutProps = folly::dynamic::object();

    for (const auto &key : dynamic.keys()) {
      const auto propNameKey = key.asString();
      const auto propName = propNameFromString(propNameKey);
      if (!propName.has_value() || isLayoutProp(propName.value())) {
        continue;
      }

      nonLayoutProps[propNameKey] = dynamic[propNameKey];
    }

    if (nonLayoutProps.empty()) {
      continue;
    }

    mergeDynamicIntoMutations(mutations, node, nonLayoutProps, false);
  }
}

} // namespace reanimated::css
