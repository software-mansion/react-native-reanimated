#pragma once

#include <jsi/jsi.h>
#include <react/renderer/graphics/Transform.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <worklets/Compat/StableApi.h>

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

struct LayoutAnimationConfig {
  int tag;
  LayoutAnimationType type;
  std::shared_ptr<worklets::Serializable> config;
  std::string sharedTransitionTag;
};

class LayoutAnimationsManager {
 public:
  LayoutAnimationsManager() : sharedTransitionManager_(std::make_shared<SharedTransitionManager>()) {}
  void configureAnimationBatch(const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch);
  void setShouldAnimateExiting(const int tag, const bool value);
  bool shouldAnimateExiting(const int tag, const bool shouldAnimate);
  bool hasLayoutAnimation(const int tag, const LayoutAnimationType type);
  void startLayoutAnimation(jsi::Runtime &rt, const int tag, const LayoutAnimationType type, const jsi::Object &values);
  void clearLayoutAnimationConfig(const int tag);
  void cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const;
  void transferConfigFromNativeID(const int nativeId, const int tag);
  void transferSharedConfig(const Tag from, const Tag to);
  std::shared_ptr<SharedTransitionManager> getSharedTransitionManager();

 private:
  std::unordered_map<int, std::shared_ptr<worklets::Serializable>> &getConfigsForType(const LayoutAnimationType type);

  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  std::unordered_map<int, std::shared_ptr<worklets::Serializable>> enteringAnimationsForNativeID_;
  std::unordered_map<int, std::shared_ptr<worklets::Serializable>> sharedTransitionsForNativeID_;
  std::unordered_map<int, std::shared_ptr<worklets::Serializable>> sharedTransitions_;
  std::unordered_map<int, std::shared_ptr<worklets::Serializable>> enteringAnimations_;
  std::unordered_map<int, std::shared_ptr<worklets::Serializable>> exitingAnimations_;
  std::unordered_map<int, std::shared_ptr<worklets::Serializable>> layoutAnimations_;
  std::unordered_map<int, bool> shouldAnimateExitingForTag_;
  mutable std::recursive_mutex animationsMutex_; // Protects `enteringAnimations_`, `exitingAnimations_`,
  // `layoutAnimations_` and `shouldAnimateExitingForTag_`.
};

} // namespace reanimated
