#pragma once

#include <reanimated/CSS/utils/propNameFromString.h>
#include <reanimated/CSS/utils/propsLayoutFilter.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <reanimated/CSS/common/values/CSSValueVariant.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>
#include <react/renderer/core/RawProps.h>

#include <folly/dynamic.h>

#include <memory>
#include <variant>

namespace reanimated::css {

inline folly::dynamic mergeDynamicObjects(folly::dynamic base, const folly::dynamic &updates) {
  if (!base.isObject() || !updates.isObject()) {
    return updates;
  }

  for (const auto &key : updates.keys()) {
    const auto &updateValue = updates.at(key);

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

inline void storeDynamicMerged(
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
inline void storeCssValueVariantAsRawProp(
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
inline void storeCssValueVariantAsNestedRawProp(
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
      // TODO: check if batch contains only non-layout animations.
      mergeDynamicIntoMutations(mutations, node, dynamic, true);
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
