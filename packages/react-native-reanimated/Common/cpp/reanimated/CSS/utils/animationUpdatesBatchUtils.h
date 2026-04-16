#pragma once

#include <reanimated/CSS/common/values/CSSValueVariant.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>

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

} // namespace reanimated::css
