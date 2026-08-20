#pragma once

#include <jsi/jsi.h>
#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowView.h>
#include <react/renderer/uimanager/UIManager.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <deque>
#include <memory>
#include <mutex>
#include <optional>
#include <unordered_map>
#include <unordered_set>
#include <variant>
#include <vector>

namespace reanimated {

struct LayoutAnimation {
  ShadowView finalView, currentView, startView;
  Tag parentTag;
  std::optional<double> opacity;
  LayoutAnimationType type;
  LayoutAnimation &operator=(const LayoutAnimation &other) = default;
};

struct CompletedLayoutAnimation {
  LayoutAnimation animation;
  bool shouldRemove;
};

struct ManagedLayoutAnimationStart {
  Tag tag;
  LayoutAnimationType type;
  ShadowView before, after;
  Tag parentTag;
  std::optional<double> opacity;
  std::shared_ptr<Serializable> config;
};

struct ProgressLayoutAnimationStart {
  Tag tag;
  ShadowView before, after;
  Tag parentTag;
};

struct LayoutAnimationCancellation {
  Tag tag;
  bool shouldStopManager;
};

using LayoutAnimationOperation =
    std::variant<ManagedLayoutAnimationStart, ProgressLayoutAnimationStart, LayoutAnimationCancellation>;

struct LayoutAnimationsProxyDependencies {
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager;
  SharedComponentDescriptorRegistry componentDescriptorRegistry;
  std::shared_ptr<const ContextContainer> contextContainer;
  jsi::Runtime &uiRuntime;
  std::shared_ptr<UIScheduler> uiScheduler;
  std::shared_ptr<facebook::react::UIManager> uiManager;
  std::function<void(SurfaceId)> requestLayoutAnimationFlush;
#ifdef ANDROID
  PreserveMountedTagsFunction filterUnmountedTagsFunction;
  std::shared_ptr<facebook::react::CallInvoker> jsInvoker;
#endif
#ifdef __APPLE__
  ForceScreenSnapshotFunction forceScreenSnapshot;
#endif
};

class LayoutAnimationsProxyCommon : public facebook::react::MountingOverrideDelegate,
                                    public std::enable_shared_from_this<LayoutAnimationsProxyCommon> {
 public:
  LayoutAnimationsProxyCommon(SurfaceId surfaceId, const LayoutAnimationsProxyDependencies &dependencies)
      : surfaceId_(surfaceId),
        layoutAnimationsManager_(dependencies.layoutAnimationsManager),
        contextContainer_(dependencies.contextContainer),
        componentDescriptorRegistry_(dependencies.componentDescriptorRegistry),
        uiRuntime_(dependencies.uiRuntime),
        uiScheduler_(dependencies.uiScheduler),
        uiManager_(dependencies.uiManager),
        requestLayoutAnimationFlush_(dependencies.requestLayoutAnimationFlush)
#ifdef ANDROID
        ,
        preserveMountedTags_(dependencies.filterUnmountedTagsFunction),
        jsInvoker_(dependencies.jsInvoker)
#endif
  {
  }
  virtual std::optional<facebook::react::SurfaceId>
  onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward);
  virtual std::optional<facebook::react::SurfaceId> onGestureCancel(int tag);
  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  virtual std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove) = 0;
  virtual void startSurface(
      const facebook::react::ShadowTree &shadowTree,
      std::weak_ptr<const facebook::react::MountingOverrideDelegate> mountingOverrideDelegate);
  virtual void shadowTreeWillCommit(bool /*isSurfaceRemoval*/) {}
  virtual void surfaceDidUnmount();
  ~LayoutAnimationsProxyCommon() override = default;

  void flushLayoutAnimationOperations() const;

 protected:
  void transferConfigFromNativeID(const std::string &nativeId, const int tag) const;
  void enqueueLayoutAnimation(ManagedLayoutAnimationStart start) const;
  void enqueueLayoutAnimation(ProgressLayoutAnimationStart start) const;
  void flushLayoutAnimationOperations(std::unique_lock<std::recursive_mutex> &lock) const;
  void cancelLayoutAnimation(Tag tag) const;
  void cancelAllLayoutAnimations() const;
  bool hasPendingLayoutAnimation(Tag tag) const;
  void updateLayoutAnimationTarget(
      Tag tag,
      const ShadowView &finalView,
      const std::shared_ptr<Serializable> &config = nullptr) const;
  std::optional<ShadowView> reparentLayoutAnimation(Tag tag, Tag parentTag) const;
  void schedulePullOnNextFrame() const;
  void maybeUpdateWindowDimensions(const ShadowViewMutation &mutation) const;
  void cleanupCompletedAnimations(
      ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext,
      bool preserveRemovals = false,
      const std::unordered_set<Tag> &preservedTags = {}) const;
  ShadowView cloneViewWithOpacity(
      const ShadowView &shadowView,
      double opacity,
      const PropsParserContext &propsParserContext) const;
#ifdef ANDROID
  void scheduleCleanupPull() const;
#endif

  const SurfaceId surfaceId_;
  mutable std::recursive_mutex mutex;
  mutable std::unordered_map<Tag, UpdateValues> updateMap_;
  mutable Rect window_{0, 0};
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  // endLayoutAnimation runs outside pullTransaction on both platforms, so its
  // animation state must survive until a pull emits the final update or removal.
  mutable std::unordered_map<Tag, CompletedLayoutAnimation> completedAnimations_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  std::shared_ptr<const ContextContainer> contextContainer_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  jsi::Runtime &uiRuntime_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  std::shared_ptr<facebook::react::UIManager> uiManager_;
  std::function<void(SurfaceId)> requestLayoutAnimationFlush_;
#ifdef ANDROID
  PreserveMountedTagsFunction preserveMountedTags_;
  std::shared_ptr<facebook::react::CallInvoker> jsInvoker_;
#endif

 private:
  struct LayoutAnimationStop {
    Tag tag;
  };

  struct PreparedLayoutAnimationStart {
    ManagedLayoutAnimationStart start;
    Rect window;
  };
  using PreparedLayoutAnimationOperation =
      std::variant<PreparedLayoutAnimationStart, LayoutAnimationStop, std::monostate>;
#ifdef ANDROID
  struct OpacityRestoration {
    ShadowView shadowView;
    double opacity;
  };
#endif

  void reconcileLayoutAnimationOperations(std::deque<LayoutAnimationOperation> &operations) const;
  void flushLayoutAnimationOperationsLocked() const;
  std::optional<PreparedLayoutAnimationOperation> takeNextLayoutAnimationOperation(
      std::deque<LayoutAnimationOperation> &operations) const;
  ShadowView materializeLayoutAnimation(
      Tag tag,
      const ShadowView &before,
      const ShadowView &after,
      Tag parentTag,
      std::optional<double> opacity,
      LayoutAnimationType type) const;
#ifdef ANDROID
  void restoreOpacityInShadowTree(std::vector<OpacityRestoration> restorations) const;
#endif

  struct PendingLayoutAnimation {
    LayoutAnimationType type;
    size_t operationIndex;
  };

  mutable std::deque<LayoutAnimationOperation> layoutAnimationOperations_;
  mutable std::unordered_map<Tag, PendingLayoutAnimation> pendingLayoutAnimations_;
};

} // namespace reanimated
