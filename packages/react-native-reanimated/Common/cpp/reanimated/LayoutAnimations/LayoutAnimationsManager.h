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

class LayoutAnimationsManager : public std::enable_shared_from_this<LayoutAnimationsManager> {
 public:
  using NativeLayoutAnimationCompletionHandler = std::function<void(NativeLayoutAnimationHandle, bool shouldRemove)>;

  LayoutAnimationsManager(
      RunNativeLayoutAnimation runNativeLayoutAnimation,
      CancelNativeLayoutAnimation cancelNativeLayoutAnimation)
      : sharedTransitionManager_(std::make_shared<SharedTransitionManager>()),
        runNativeLayoutAnimation_(std::move(runNativeLayoutAnimation)),
        cancelNativeLayoutAnimation_(std::move(cancelNativeLayoutAnimation)) {}

  void setNativeLayoutAnimationCompletionHandler(NativeLayoutAnimationCompletionHandler handler) {
    nativeLayoutAnimationCompletionHandler_ = std::move(handler);
  }

  // LayoutAnimationTrace start
#ifndef NDEBUG
  void setNativeLayoutAnimationStartPaused(bool paused);
#endif
  // LayoutAnimationTrace end

  void configureAnimationBatch(const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch);
  void setShouldAnimateExiting(const int tag, const bool value);
  bool shouldAnimateExiting(const int tag, const bool shouldAnimate);
  bool hasLayoutAnimation(const int tag, const LayoutAnimationType type);
  void startLayoutAnimation(jsi::Runtime &rt, const int tag, const LayoutAnimationType type, const jsi::Object &values);
  // Computes a generic keyframe descriptor in JS (by sampling the preset's
  // animation objects for the given runtime `values`) and hands it to the
  // platform's native animation player. Used instead of `startLayoutAnimation`
  // when the native layout-animations feature flag is enabled.
  void startNativeLayoutAnimation(
      jsi::Runtime &rt,
      const int tag,
      const LayoutAnimationType type,
      const jsi::Object &values,
      const bool usePresentationLayer,
      const bool shouldRemove);
  bool hasNativeLayoutAnimationPlayer() const {
    return runNativeLayoutAnimation_ != nullptr;
  }
  void clearLayoutAnimationConfig(const int tag);
  void cancelLayoutAnimation(jsi::Runtime &rt, const int tag);
  void transferConfigFromNativeID(const int nativeId, const int tag);
  void transferSharedConfig(const Tag from, const Tag to);
  std::shared_ptr<SharedTransitionManager> getSharedTransitionManager();

  static const LayoutAnimationRawConfig extractRawConfigValues(jsi::Runtime &rt, const jsi::Object &rawConfig);

 private:
  using LayoutAnimationConfigEntry =
      std::pair<std::shared_ptr<Serializable>, std::shared_ptr<LayoutAnimationRawConfig>>;

  struct ActiveNativeLayoutAnimation {
    NativeLayoutAnimationHandle handle;
    NativeLayoutAnimationCancellationToken cancellationToken;
    NativeLayoutAnimationTargetMask targets;
    bool shouldRemoveOnTermination;
  };

  struct NativeLayoutAnimationsForTag {
    uint64_t nextGeneration = 0;
    std::vector<ActiveNativeLayoutAnimation> active;
  };

  // LayoutAnimationTrace start
#ifndef NDEBUG
  struct PendingNativeLayoutAnimationStart {
    NativeLayoutAnimationHandle handle;
    NativeLayoutAnimationDescriptor descriptor;
    bool usePresentationLayer;
    NativeLayoutAnimationCancellationToken cancellationToken;
    std::function<void(bool)> completion;
  };
#endif
  // LayoutAnimationTrace end

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

  RunNativeLayoutAnimation runNativeLayoutAnimation_;
  CancelNativeLayoutAnimation cancelNativeLayoutAnimation_;
  NativeLayoutAnimationCompletionHandler nativeLayoutAnimationCompletionHandler_;
  std::unordered_map<int, NativeLayoutAnimationsForTag> nativeAnimations_;

  // LayoutAnimationTrace start
#ifndef NDEBUG
  bool nativeLayoutAnimationStartPaused_ = false;
  std::vector<PendingNativeLayoutAnimationStart> pendingNativeLayoutAnimationStarts_;
#endif
  // LayoutAnimationTrace end

  void finishNativeLayoutAnimation(jsi::Runtime &rt, NativeLayoutAnimationHandle handle, bool finished);
  void cancelNativeLayoutAnimationHandle(jsi::Runtime &rt, NativeLayoutAnimationHandle handle);
  void submitNativeLayoutAnimationStart(
      NativeLayoutAnimationHandle handle,
      const NativeLayoutAnimationDescriptor &descriptor,
      bool usePresentationLayer,
      NativeLayoutAnimationCancellationToken cancellationToken,
      std::function<void(bool)> &&completion);
};

} // namespace reanimated
