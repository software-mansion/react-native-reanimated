#pragma once

#include <react/renderer/graphics/Transform.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <reanimated/LayoutAnimations/LiveLayoutLeaf.h>
#include <reanimated/LayoutAnimations/NativeLayoutLimits.h>

#include <jsi/jsi.h>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>
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
  std::unordered_map<Tag, std::string> nativeIDToName_;
  Tag nextContainerTag_{10000002};
};

struct LayoutAnimationConfig {
  int tag;
  LayoutAnimationType type;
  std::shared_ptr<Serializable> config;
  std::string sharedTransitionTag;
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
  std::shared_ptr<Serializable> takeExitingAnimationConfigAndClearTag(int tag);
  void startLayoutAnimation(
      jsi::Runtime &rt,
      const int tag,
      const LayoutAnimationType type,
      const jsi::Object &values,
      const std::shared_ptr<Serializable> &config);
  /// Gives the value that each live leaf of a view has at the start time of this batch.
  jsi::Object captureLiveLayoutLeaves(jsi::Runtime &rt, const LiveLayoutLeaves &liveLeaves);
  /// Calls the builder of `config` one time and keeps its result on the UI runtime under `buildId`. Gives the
  /// summary of the result, or undefined when the builder throws. `liveLeaves` are the live leaves of the view.
  jsi::Value buildLayoutAnimation(
      jsi::Runtime &rt,
      uint64_t buildId,
      const jsi::Object &values,
      const std::shared_ptr<Serializable> &config,
      const NativeLayoutLimits &limits,
      const LiveLayoutLeaves &liveLeaves);
  /// Starts the frame-driven animation of the build. It continues the `liveLeaves` of the view.
  void startBuiltLayoutAnimation(
      jsi::Runtime &rt,
      int tag,
      LayoutAnimationType type,
      uint64_t buildId,
      const LiveLayoutLeaves &liveLeaves);
  /// Gives the result to the callback of a build that plays natively.
  void finishBuiltLayoutAnimation(jsi::Runtime &rt, uint64_t buildId, bool finished);
  void releaseBuiltLayoutAnimation(jsi::Runtime &rt, uint64_t buildId);
  void clearLayoutAnimationConfig(const int tag);
  void cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const;
  void transferConfigFromNativeID(const int nativeId, const int tag);
  std::shared_ptr<SharedTransitionManager> getSharedTransitionManager();

 private:
  std::unordered_map<int, std::shared_ptr<Serializable>> &getConfigsForType(const LayoutAnimationType type);
  static jsi::Function getManagerFunction(jsi::Runtime &rt, const char *name);
  static jsi::Object toJSValue(jsi::Runtime &rt, const NativeLayoutLimits &limits);
  static jsi::Array toJSValue(jsi::Runtime &rt, const LiveLayoutLeaves &liveLeaves);

  std::shared_ptr<SharedTransitionManager> sharedTransitionManager_;
  std::unordered_map<int, std::shared_ptr<Serializable>> enteringAnimationsForNativeID_;
  std::unordered_map<int, std::shared_ptr<Serializable>> sharedTransitionsForNativeID_;
  std::unordered_map<int, std::shared_ptr<Serializable>> sharedTransitions_;
  std::unordered_map<int, std::shared_ptr<Serializable>> enteringAnimations_;
  std::unordered_map<int, std::shared_ptr<Serializable>> exitingAnimations_;
  std::unordered_map<int, std::shared_ptr<Serializable>> layoutAnimations_;
  std::unordered_map<int, bool> shouldAnimateExitingForTag_;
  std::mutex pendingConfigUpdatesMutex_;
  std::vector<LayoutAnimationConfig> pendingConfigUpdates_;
  mutable std::recursive_mutex animationsMutex_; // Protects `enteringAnimationsForNativeID_`,
  // `sharedTransitionsForNativeID_`, `sharedTransitions_`, `enteringAnimations_`, `exitingAnimations_`,
  // `layoutAnimations_` and `shouldAnimateExitingForTag_`.
};

} // namespace reanimated
