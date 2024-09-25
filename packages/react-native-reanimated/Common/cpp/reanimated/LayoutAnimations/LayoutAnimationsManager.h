#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationType.h>

#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/JSLogger.h>

#include <jsi/jsi.h>
#include <stdio.h>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace worklets;

struct LayoutAnimationConfig {
  int tag;
  LayoutAnimationType type;
  std::shared_ptr<Shareable> config;
  std::string sharedTransitionTag;
};

class LayoutAnimationsManager {
 public:
  explicit LayoutAnimationsManager(const std::shared_ptr<JSLogger> &jsLogger)
      : jsLogger_(jsLogger) {}
  void configureAnimationBatch(
      const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch);
  void setShouldAnimateExiting(const int tag, const bool value);
  bool shouldAnimateExiting(const int tag, const bool shouldAnimate);
  bool hasLayoutAnimation(const int tag, const LayoutAnimationType type);
  void startLayoutAnimation(
      jsi::Runtime &rt,
      const int tag,
      const LayoutAnimationType type,
      const jsi::Object &values);
  void clearLayoutAnimationConfig(const int tag);
  void clearSharedTransitionConfig(const int tag);
  void cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const;
#ifdef RCT_NEW_ARCH_ENABLED
  void transferConfigFromNativeID(const int nativeId, const int tag);
#endif
  int findPrecedingViewTagForTransition(const int tag);
  const std::vector<int> &getSharedGroup(const int viewTag);
#ifndef NDEBUG
  std::string getScreenSharedTagPairString(
      const int screenTag,
      const std::string &sharedTag) const;
  void checkDuplicateSharedTag(const int viewTag, const int screenTag);
#endif

 private:
  std::unordered_map<int, std::shared_ptr<Shareable>> &getConfigsForType(
      const LayoutAnimationType type);

  std::shared_ptr<JSLogger> jsLogger_;
#ifndef NDEBUG
  // This set's function is to detect duplicate sharedTags on a single screen
  // it contains strings in form: "reactScreenTag:sharedTag"
  std::unordered_set<std::string> screenSharedTagSet_;
  // And this map is to remove collected pairs on SET removal
  std::unordered_map<int, std::string> viewsScreenSharedTagMap_;
#endif

#ifdef RCT_NEW_ARCH_ENABLED
  std::unordered_map<int, std::shared_ptr<Shareable>>
      enteringAnimationsForNativeID_;
#endif
  std::unordered_map<int, std::shared_ptr<Shareable>> enteringAnimations_;
  std::unordered_map<int, std::shared_ptr<Shareable>> exitingAnimations_;
  std::unordered_map<int, std::shared_ptr<Shareable>> layoutAnimations_;
  std::unordered_map<int, std::shared_ptr<Shareable>>
      sharedTransitionAnimations_;
  std::unordered_set<int> ignoreProgressAnimationForTag_;
  std::unordered_map<std::string, std::vector<int>> sharedTransitionGroups_;
  std::unordered_map<int, std::string> viewTagToSharedTag_;
  std::unordered_map<int, bool> shouldAnimateExitingForTag_;
  mutable std::recursive_mutex
      animationsMutex_; // Protects `enteringAnimations_`, `exitingAnimations_`,
  // `layoutAnimations_`, `viewSharedValues_` and `shouldAnimateExitingForTag_`.
};

} // namespace reanimated
