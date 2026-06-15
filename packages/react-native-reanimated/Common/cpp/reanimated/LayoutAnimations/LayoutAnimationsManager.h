#pragma once

#include <react/renderer/graphics/Transform.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationConfig.h>
#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <jsi/jsi.h>
#include <stdio.h>
#include <functional>
#include <memory>
#include <mutex>
#include <stack>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace facebook::react;
using namespace worklets;
using SharedTag = std::string;

// [0] is before and [1] is after (best to use BeforeOrAfter enum)
struct Transition {
  ShadowView snapshot[2];
  Tag parentTag[2] = {0, 0};
  std::optional<Transform> transform[2];
};

struct SharedTransitionManager {
  std::unordered_map<std::string, Tag> containerTags_;
  std::unordered_map<Tag, std::string> tagToName_;
  std::unordered_map<Tag, std::string> nativeIDToName_;
};

using TransitionMap = std::unordered_map<SharedTag, Transition>;
using Transitions = std::vector<std::pair<SharedTag, Transition>>;

class LayoutAnimationsManager {
 public:
  LayoutAnimationsManager() : sharedTransitionManager_(std::make_shared<SharedTransitionManager>()) {}

#if __APPLE__
  explicit LayoutAnimationsManager(RunCoreAnimationForView runCoreAnimationForView) : LayoutAnimationsManager() {
    runCoreAnimationForView_ = std::move(runCoreAnimationForView);
  }
#endif

  void configureAnimationBatch(const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch);
  void setShouldAnimateExiting(const int tag, const bool value);
  bool shouldAnimateExiting(const int tag, const bool shouldAnimate);
  bool hasLayoutAnimation(const int tag, const LayoutAnimationType type);
  void startLayoutAnimation(jsi::Runtime &rt, const int tag, const LayoutAnimationType type, const jsi::Object &values);
#if __APPLE__
  void startNativeLayoutAnimation(
      const int tag,
      const LayoutAnimationType type,
      const facebook::react::Rect &startFrame,
      const facebook::react::Rect &endFrame,
      std::function<void(bool)> &&onAnimationEnd);
#endif
  void clearLayoutAnimationConfig(const int tag);
  void cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const;
  void transferConfigFromNativeID(const int nativeId, const int tag);
  void transferSharedConfig(const Tag from, const Tag to);
  std::shared_ptr<SharedTransitionManager> getSharedTransitionManager();

  static const LayoutAnimationRawConfig extractRawConfigValues(jsi::Runtime &rt, const jsi::Object &rawConfig);

 private:
  using LayoutAnimationConfigEntry =
      std::pair<std::shared_ptr<Serializable>, std::shared_ptr<LayoutAnimationRawConfig>>;

  std::unordered_map<int, LayoutAnimationConfigEntry> &getConfigsForType(const LayoutAnimationType type);

  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  std::unordered_map<int, LayoutAnimationConfigEntry> enteringAnimationsForNativeID_;
  std::unordered_map<int, std::shared_ptr<Serializable>> sharedTransitionsForNativeID_;
  std::unordered_map<int, std::shared_ptr<Serializable>> sharedTransitions_;
  std::unordered_map<int, LayoutAnimationConfigEntry> enteringAnimations_;
  std::unordered_map<int, LayoutAnimationConfigEntry> exitingAnimations_;
  std::unordered_map<int, LayoutAnimationConfigEntry> layoutAnimations_;
  std::unordered_map<int, bool> shouldAnimateExitingForTag_;
  mutable std::recursive_mutex animationsMutex_; // Protects `enteringAnimationsForNativeID_`,
  // `sharedTransitionsForNativeID_`, `sharedTransitions_`, `enteringAnimations_`, `exitingAnimations_`,
  // `layoutAnimations_` and `shouldAnimateExitingForTag_`.

#if __APPLE__
  RunCoreAnimationForView runCoreAnimationForView_;
#endif
};

} // namespace reanimated
