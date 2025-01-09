#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/PropertyInterpolatorsConfig.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <utility>
#include <vector>

namespace reanimated {

class UpdatesRegistryManager {
 public:
  UpdatesRegistryManager();
#ifdef ANDROID
  explicit UpdatesRegistryManager(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry);
#endif

  std::lock_guard<std::mutex> createLock() const;

  // TODO - ensure that other sublibraries can easily hook into this registry
  // manager (e.g. add priority to registries)
  void addRegistry(const std::shared_ptr<UpdatesRegistry> &registry);

  void pauseReanimatedCommits();
  bool shouldReanimatedSkipCommit();
  void unpauseReanimatedCommits();

  void pleaseCommitAfterPause();
  bool shouldCommitAfterPause();

  PropsMap collectProps();

#ifdef ANDROID
  bool hasPropsToRevert();
  void collectPropsToRevertBySurface(std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  void clearPropsToRevert(SurfaceId surfaceId);
#endif

 private:
  mutable std::mutex mutex_;
  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

  void addToPropsMap(
      PropsMap &propsMap,
      const ShadowNode::Shared &shadowNode,
      const folly::dynamic &props);
#endif
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
