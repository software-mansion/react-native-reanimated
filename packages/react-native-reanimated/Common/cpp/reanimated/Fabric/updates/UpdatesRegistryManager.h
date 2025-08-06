#pragma once
#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated {

using namespace css;

class UpdatesRegistryManager {
 public:
  explicit UpdatesRegistryManager(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry);

  std::lock_guard<std::mutex> lock() const;

  // TODO - ensure that other sublibraries can easily hook into this registry
  // manager (e.g. add priority to registries)
  void addRegistry(const std::shared_ptr<UpdatesRegistry> &registry);

  void pauseReanimatedCommits();
  bool shouldReanimatedSkipCommit();
  void unpauseReanimatedCommits();

  void pleaseCommitAfterPause();
  bool shouldCommitAfterPause();
  void cancelCommitAfterPause();

  void markNodeAsRemovable(const std::shared_ptr<const ShadowNode> &shadowNode);
  void unmarkNodeAsRemovable(Tag viewTag);
  void handleNodeRemovals(const RootShadowNode &rootShadowNode);
  PropsMap collectProps();

#ifdef ANDROID
  bool hasPropsToRevert();
  void collectPropsToRevertBySurface(
      std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  void clearPropsToRevert(SurfaceId surfaceId);
#endif

 private:
  using RemovableShadowNodes =
      std::unordered_map<Tag, std::shared_ptr<const ShadowNode>>;

  mutable std::mutex mutex_;
  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
  RemovableShadowNodes removableShadowNodes_;
  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  static void addToPropsMap(
      PropsMap &propsMap,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const folly::dynamic &props);
#endif
};

} // namespace reanimated
