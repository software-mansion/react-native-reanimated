#pragma once

#include <react/renderer/graphics/Transform.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationType.h>

#include <jsi/jsi.h>
#include <functional>
#include <limits>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
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
  std::mutex mutex_;
  std::unordered_map<Tag, std::string> tagToName_;
  std::unordered_map<std::string, std::unordered_set<Tag>> nameToTags_;
  std::unordered_map<Tag, std::string> nativeIDToName_;
  // Odd tags that end in 7. React gives even tags to views and tags that end in 1 to surfaces.
  Tag nextOverlayTag_{std::numeric_limits<Tag>::max()};

  void setName(const Tag tag, const std::string &name) {
    eraseName(tag);
    tagToName_[tag] = name;
    nameToTags_[name].insert(tag);
  }

  void eraseName(const Tag tag) {
    const auto it = tagToName_.find(tag);
    if (it == tagToName_.end()) {
      return;
    }
    const auto tagsIt = nameToTags_.find(it->second);
    tagsIt->second.erase(tag);
    if (tagsIt->second.empty()) {
      nameToTags_.erase(tagsIt);
    }
    tagToName_.erase(it);
  }
};

// The fadeContent() options of a shared transition. The children fade out until fadeOutEnd of the move.
struct SharedTransitionContentFade {
  std::shared_ptr<Serializable> fadeIn;
  double fadeOutEnd = 1;
};

struct SharedTransitionConfig {
  std::shared_ptr<Serializable> animation;
  std::optional<SharedTransitionContentFade> contentFade;
  std::shared_ptr<Serializable> callback;
  // The animation aims at the current geometry of its target in each frame.
  bool followsTarget = false;
};

struct LayoutAnimationConfig {
  int tag;
  LayoutAnimationType type;
  std::shared_ptr<Serializable> config;
  std::string sharedTransitionTag;
  std::optional<SharedTransitionContentFade> sharedTransitionContentFade;
  std::shared_ptr<Serializable> sharedTransitionCallback;
  bool sharedTransitionFollowsTarget = false;
};

// TODO: Refactor LayoutAnimationsManager around surface-owned configuration.
// It is shared by all surface proxies, but configs carry no surface-lifetime identity,
// so orphaned configs cannot be cleaned up safely.
class LayoutAnimationsManager {
 public:
  LayoutAnimationsManager() : sharedTransitionManager_(std::make_shared<SharedTransitionManager>()) {}
  void configureAnimationBatch(const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch);
  std::unique_lock<std::recursive_mutex> lockAndFlushConfigUpdates();
  void setShouldAnimateExiting(const int tag, const bool value);
  bool shouldAnimateExiting(const int tag, const bool shouldAnimate);
  std::shared_ptr<Serializable> getLayoutAnimationConfig(const int tag, const LayoutAnimationType type);
  bool hasLayoutAnimationConfigs(const LayoutAnimationType type);
  std::optional<SharedTransitionConfig> getSharedTransitionConfig(const int tag);
  std::shared_ptr<Serializable> takeExitingAnimationConfigAndClearTag(int tag);
  bool startLayoutAnimation(
      jsi::Runtime &rt,
      const int tag,
      const LayoutAnimationType type,
      const jsi::Object &values,
      const std::shared_ptr<Serializable> &config);
  void clearLayoutAnimationConfig(const int tag);
  void clearSharedTransitionConfigs(const std::vector<Tag> &tags);
  void clearSharedTransitionContentFade(int tag);
  void cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const;
  void transferConfigFromNativeID(const int nativeId, const int tag);
  std::shared_ptr<SharedTransitionManager> getSharedTransitionManager();
  static bool
  runGuardedOnUIRuntime(jsi::Runtime &rt, const char *name, const std::function<void(jsi::Runtime &)> &call);

 private:
  static bool callLayoutAnimationsManager(
      jsi::Runtime &rt,
      const char *methodName,
      const std::function<void(jsi::Runtime &, const jsi::Function &)> &call);
  std::unordered_map<int, std::shared_ptr<Serializable>> &getConfigsForType(const LayoutAnimationType type);

  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  std::unordered_map<int, std::shared_ptr<Serializable>> enteringAnimationsForNativeID_;
  std::unordered_map<int, SharedTransitionConfig> sharedTransitionsForNativeID_;
  std::unordered_map<int, SharedTransitionConfig> sharedTransitions_;
  std::unordered_map<int, std::shared_ptr<Serializable>> progressSharedTransitions_;
  std::unordered_map<int, std::shared_ptr<Serializable>> progressSharedTransitionsForNativeID_;
  std::unordered_map<int, std::shared_ptr<Serializable>> enteringAnimations_;
  std::unordered_map<int, std::shared_ptr<Serializable>> exitingAnimations_;
  std::unordered_map<int, std::shared_ptr<Serializable>> layoutAnimations_;
  std::unordered_map<int, bool> shouldAnimateExitingForTag_;
  std::mutex pendingConfigUpdatesMutex_;
  std::vector<LayoutAnimationConfig> pendingConfigUpdates_;
  mutable std::recursive_mutex animationsMutex_; // Protects `enteringAnimationsForNativeID_`,
  // `sharedTransitionsForNativeID_`, `sharedTransitions_`, `progressSharedTransitions_`,
  // `progressSharedTransitionsForNativeID_`, `enteringAnimations_`, `exitingAnimations_`,
  // `layoutAnimations_` and `shouldAnimateExitingForTag_`.
};

} // namespace reanimated
