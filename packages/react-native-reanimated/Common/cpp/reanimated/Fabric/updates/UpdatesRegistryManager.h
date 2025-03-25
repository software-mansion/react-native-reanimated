#pragma once

#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>
#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>
#include <reanimated/CSS/registry/CSSTransitionsRegistry.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

using namespace css;

class UpdatesRegistryManager {
 public:
  explicit UpdatesRegistryManager(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const std::shared_ptr<CSSTransitionsRegistry> &cssTransitionsRegistry,
      const std::shared_ptr<AnimatedPropsRegistry> &animatedPropsRegistry,
      const std::shared_ptr<CSSAnimationsRegistry> &cssAnimationsRegistry,
      const GetAnimationTimestampFunction &getCurrentTimestamp);

  std::lock_guard<std::mutex> lock() const;

  void pauseReanimatedCommits();
  bool shouldReanimatedSkipCommit();
  void unpauseReanimatedCommits();

  void pleaseCommitAfterPause();
  bool shouldCommitAfterPause();
  void cancelCommitAfterPause();

  void markNodeAsRemovable(const ShadowNode::Shared &shadowNode);
  void unmarkNodeAsRemovable(Tag viewTag);
  void handleNodeRemovals(const RootShadowNode &rootShadowNode);

  PropsBatch getFrameUpdates(double timestamp, bool updateCssAnimations);
  PropsMap getAllProps();

#ifdef ANDROID
  bool hasPropsToRevert();
  void collectPropsToRevertBySurface(
      std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  void clearPropsToRevert(SurfaceId surfaceId);
#endif

 private:
  mutable std::mutex mutex_;
  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
  std::unordered_map<Tag, ShadowNode::Shared> removableShadowNodes_;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  const std::shared_ptr<CSSTransitionsRegistry> cssTransitionsRegistry_;
  const std::shared_ptr<AnimatedPropsRegistry> animatedPropsRegistry_;
  const std::shared_ptr<CSSAnimationsRegistry> cssAnimationsRegistry_;

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  static void addToPropsMap(
      PropsMap &propsMap,
      const ShadowNode::Shared &shadowNode,
      const folly::dynamic &props);
#endif
};

} // namespace reanimated
