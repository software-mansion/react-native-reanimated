#pragma once

#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/registries/StaticPropsRegistry.h>

#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <atomic>
#include <memory>
#include <unordered_map>
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

  explicit UpdatesRegistryManager(const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry);

  ScopedLock lock() const;
  static bool isLockedByCurrentThread();

  // TODO - ensure that other sublibraries can easily hook into this registry
  // manager (e.g. add priority to registries)
  void addRegistry(const std::shared_ptr<UpdatesRegistry> &registry);

  void pauseReanimatedCommits();
  bool shouldReanimatedSkipCommit();
  void unpauseReanimatedCommits();

  void pleaseCommitAfterPause();
  bool shouldCommitAfterPause();
  void cancelCommitAfterPause();

  /// A node JS detached while it was still in its surface's committed tree (a frozen
  /// screen); the first sweep that finds it gone evicts it.
  void addDetachedNode(const ShadowNodeFamily::Shared &shadowNodeFamily);
  void removeDetachedNode(Tag viewTag);
  void evictNode(Tag viewTag);
  /// Evicts the detached nodes of the root's surface that are no longer in the tree. Pass a
  /// committed root, never a mounted one: mounts are reported late, so an older mounted
  /// root can predate a node that is still alive.
  void handleNodeRemovals(const RootShadowNode &committedRoot);
  void handleSurfaceUnmount(SurfaceId surfaceId);
  PropsMap collectProps();
  void mergeRegistryProps(Tag viewTag, folly::dynamic &target);

#ifdef ANDROID
  bool hasPropsToRevert();
  void collectPropsToRevertBySurface(std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  void clearPropsToRevert(SurfaceId surfaceId);
#endif

 private:
  using DetachedNodes = std::unordered_map<Tag, ShadowNodeFamily::Shared>;

  mutable std::mutex mutex_;
  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
  DetachedNodes detachedNodes_;
  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  static void
  addToPropsMap(PropsMap &propsMap, const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props);
#endif
};

} // namespace reanimated
