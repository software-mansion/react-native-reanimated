#include "LayoutAnimationsManager.h"
#include "CollectionUtils.h"
#include "Shareables.h"

#include <utility>

namespace reanimated {

void LayoutAnimationsManager::configureAnimation(
    int tag,
    const std::string &type,
    const std::string &sharedTransitionTag,
    std::shared_ptr<Shareable> config) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  if (type == "entering") {
    enteringAnimations_[tag] = config;
  } else if (type == "exiting") {
    exitingAnimations_[tag] = config;
  } else if (type == "layout") {
    layoutAnimations_[tag] = config;
  } else if (type == "sharedElementTransition") {
    sharedTransitionAnimations_[tag] = config;
    sharedTransitionGroups_.try_emplace(sharedTransitionTag);
    auto &group = sharedTransitionGroups_[sharedTransitionTag];
    if (group.size() < 2) {
      group.push_back(tag);
    } else {
      // at this moment we want to allow only for two-items groups
      group[0] = group[1];
      group[1] = tag;
    }
  }
}

bool LayoutAnimationsManager::hasLayoutAnimation(
    int tag,
    const std::string &type) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  if (type == "entering") {
    return collection::mapContains(enteringAnimations_, tag);
  } else if (type == "exiting") {
    return collection::mapContains(exitingAnimations_, tag);
  } else if (type == "layout") {
    return collection::mapContains(layoutAnimations_, tag);
  } else if (type == "sharedElementTransition") {
    return collection::mapContains(sharedTransitionAnimations_, tag);
  }
  return false;
}

void LayoutAnimationsManager::clearLayoutAnimationConfig(int tag) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  enteringAnimations_.erase(tag);
  exitingAnimations_.erase(tag);
  layoutAnimations_.erase(tag);

  sharedTransitionAnimations_.erase(tag);
  for (auto &[key, group] : sharedTransitionGroups_) {
    auto position = std::find(group.begin(), group.end(), tag);
    if (position != group.end()) {
      group.erase(position);
    }
  }
}

void LayoutAnimationsManager::startLayoutAnimation(
    jsi::Runtime &rt,
    int tag,
    const std::string &type,
    const jsi::Object &values) {
  std::shared_ptr<Shareable> config, viewShareable;
  {
    auto lock = std::unique_lock<std::mutex>(animationsMutex_);
    if (type == "entering") {
      config = enteringAnimations_[tag];
    } else if (type == "exiting") {
      config = exitingAnimations_[tag];
    } else if (type == "layout") {
      config = layoutAnimations_[tag];
    } else if (type == "sharedElementTransition") {
      config = sharedTransitionAnimations_[tag];
    }
  }

  // TODO: cache the following!!
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global()
          .getPropertyAsObject(rt, "global")
          .getProperty(rt, "LayoutAnimationsManager");
  jsi::Function startAnimationForTag =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(
          rt, "start");
  startAnimationForTag.call(
      rt,
      jsi::Value(tag),
      jsi::String::createFromAscii(rt, type),
      values,
      config->getJSValue(rt));
}

int LayoutAnimationsManager::findTheOtherForSharedTransition(int tag) {
  int theOtherTag = -1;
  for (auto const &[key, group] : sharedTransitionGroups_) {
    auto position = std::find(group.begin(), group.end(), tag);
    if (position != group.end()) {
      int index = position - group.begin();
      if (index > 0) {
        return group[index - 1]; // get one before
      }
    }
  }
  return theOtherTag;
}

} // namespace reanimated
