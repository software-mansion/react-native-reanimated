#include "LayoutAnimationsManager.h"
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
    if (sharedTransitionGroups_.find(sharedTransitionTag) ==
        sharedTransitionGroups_.end()) {
      sharedTransitionGroups_[sharedTransitionTag] = std::vector<int>();
    }
    sharedTransitionGroups_[sharedTransitionTag].push_back(tag);
  }
}

bool LayoutAnimationsManager::hasLayoutAnimation(
    int tag,
    const std::string &type) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  if (type == "entering") {
    return enteringAnimations_.find(tag) != enteringAnimations_.end();
  } else if (type == "exiting") {
    return exitingAnimations_.find(tag) != exitingAnimations_.end();
  } else if (type == "layout") {
    return layoutAnimations_.find(tag) != layoutAnimations_.end();
  } else if (type == "sharedElementTransition") {
    return sharedTransitionAnimations_.find(tag) !=
        sharedTransitionAnimations_.end();
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
    bool isCurrentGroupMember = false;
    int indexInGroup;
    for (indexInGroup = 0; indexInGroup < group.size(); indexInGroup++) {
      if (group[indexInGroup] == tag) {
        isCurrentGroupMember = true;
        break;
      }
    }
    if (isCurrentGroupMember) {
      group.erase(group.begin() + indexInGroup);
      break;
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
    bool isCurrentGroupMember = false;
    int indexInGroup;
    for (indexInGroup = 0; indexInGroup < group.size(); indexInGroup++) {
      if (group[indexInGroup] == tag) {
        isCurrentGroupMember = true;
        break;
      }
    }
    if (isCurrentGroupMember && indexInGroup > 0) {
      theOtherTag = group[indexInGroup - 1];
      break;
    }
  }
  return theOtherTag;
}

} // namespace reanimated
