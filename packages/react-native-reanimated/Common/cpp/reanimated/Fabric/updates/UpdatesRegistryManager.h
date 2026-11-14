#pragma once

#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/registries/StaticPropsRegistry.h>

#include <reanimated/Fabric/MountedRootsRegistry.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <optional>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using namespace css;

class UpdatesRegistryManager {
 public:
  class [[nodiscard]] ScopedLock {
   public:
    explicit ScopedLock(std::mutex &mutex);
    ~ScopedLock();

   private:
    std::lock_guard<std::mutex> guard_;
  };

  UpdatesRegistryManager(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const std::shared_ptr<MountedRootsRegistry> &mountedRootsRegistry);

  ScopedLock lock() const;
  static bool isLockedByCurrentThread();

  // TODO - ensure that other sublibraries can easily hook into this registry
  // manager (e.g. add priority to registries)
  void addRegistry(const std::shared_ptr<UpdatesRegistry> &registry);

  // A React commit pauses Reanimated commits of its own surface until it
  // mounts. Other surfaces keep committing.
  void pauseReanimatedCommits(SurfaceId surfaceId);
  bool shouldReanimatedSkipCommit(SurfaceId surfaceId);
  void unpauseReanimatedCommits(SurfaceId surfaceId);

  void pleaseCommitAfterPause(SurfaceId surfaceId);
  bool shouldCommitAfterPause(SurfaceId surfaceId);
  void cancelCommitAfterPause(SurfaceId surfaceId);

  void markNodeAsRemovable(const std::shared_ptr<const ShadowNode> &shadowNode);
  void unmarkNodeAsRemovable(Tag viewTag);
  std::vector<Tag> handleNodeRemovals(SurfaceId surfaceId);
  PropsMap collectProps();
  void mergeRegistryProps(Tag viewTag, folly::dynamic &target);
  std::optional<folly::dynamic> getRegistryProp(Tag viewTag, const char *propName) const;
#ifdef ANDROID
  void mergeRegistryProps(Tag viewTag, folly::dynamic &target, PropNamePredicate isIncluded);
#endif

#ifdef ANDROID
  bool hasPropsToRevert();
  void collectPropsToRevertBySurface(std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  void clearPropsToRevert(SurfaceId surfaceId);
#endif

 private:
  using RemovableShadowNodes = std::unordered_map<Tag, ShadowNodeFamily::Shared>;

  mutable std::mutex mutex_;
  // Guards only the two sets below. Nothing else is locked while it is held.
  mutable std::mutex pauseMutex_;
  std::unordered_set<SurfaceId> pausedSurfaces_;
  std::unordered_set<SurfaceId> surfacesToCommitAfterPause_;
  RemovableShadowNodes removableShadowNodes_;
  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  const std::shared_ptr<MountedRootsRegistry> mountedRootsRegistry_;

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  static void
  addToPropsMap(PropsMap &propsMap, const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props);
#endif
};

} // namespace reanimated
