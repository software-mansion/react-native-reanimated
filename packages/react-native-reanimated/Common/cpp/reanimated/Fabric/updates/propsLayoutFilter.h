#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Fabric/updates/propNameFromString.h>

#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>

#include <set>

namespace reanimated {

// On Android, non-layout props need to be packed into the rawProps unless props 2.0 are enabled.
inline bool shouldFilterNonLayoutProps() {
#ifdef ANDROID
  return !facebook::react::ReactNativeFeatureFlags::enablePropsUpdateReconciliationAndroid();
#else
  return false;
#endif
}

inline const std::set<facebook::react::PropName> &layoutPropNames() {
  static const std::set<facebook::react::PropName> props = {
      facebook::react::WIDTH,        facebook::react::HEIGHT,         facebook::react::FLEX,
      facebook::react::MARGIN,       facebook::react::PADDING,        facebook::react::POSITION,
      facebook::react::BORDER_WIDTH, facebook::react::ALIGN_CONTENT,  facebook::react::ALIGN_ITEMS,
      facebook::react::ALIGN_SELF,   facebook::react::ASPECT_RATIO,   facebook::react::BOX_SIZING,
      facebook::react::DISPLAY,      facebook::react::FLEX_BASIS,     facebook::react::FLEX_DIRECTION,
      facebook::react::ROW_GAP,      facebook::react::COLUMN_GAP,     facebook::react::FLEX_GROW,
      facebook::react::FLEX_SHRINK,  facebook::react::FLEX_WRAP,      facebook::react::JUSTIFY_CONTENT,
      facebook::react::MAX_HEIGHT,   facebook::react::MAX_WIDTH,      facebook::react::MIN_HEIGHT,
      facebook::react::MIN_WIDTH,    facebook::react::STYLE_OVERFLOW, facebook::react::POSITION_TYPE,
      facebook::react::DIRECTION,    facebook::react::Z_INDEX,
  };

  return props;
}

inline bool isLayoutProp(facebook::react::PropName propName) {
  return layoutPropNames().contains(propName);
}

inline bool shouldSkipNonLayoutProp(facebook::react::PropName propName) {
  if (shouldFilterNonLayoutProps()) {
    return !isLayoutProp(propName);
  }
  return false;
}

inline bool mutationHasLayoutUpdates(const facebook::react::AnimatedProps &animatedProps) {
  for (const auto &prop : animatedProps.props) {
    if (isLayoutProp(prop->propName)) {
      return true;
    }
  }

  if (!animatedProps.rawProps) {
    return false;
  }

  const auto rawPropsDynamic = animatedProps.rawProps->toDynamic();
  for (const auto &key : rawPropsDynamic.keys()) {
    if (!key.isString()) {
      continue;
    }

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

inline bool hasLayoutProps(const folly::dynamic &props) {
  for (const auto &key : props.keys()) {
    const auto propName = propNameFromString(key.asString());
    if (propName.has_value() && isLayoutProp(propName.value())) {
      return true;
    }
  }
  return false;
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

} // namespace reanimated
