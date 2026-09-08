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

  void markNodeAsRemovable(const std::shared_ptr<const ShadowNode> &shadowNode);
  void unmarkNodeAsRemovable(Tag viewTag);
  void handleNodeRemovals(const RootShadowNode &rootShadowNode);
  PropsMap collectProps();

  /// Values the synchronous path applied that no Reanimated commit has
  /// carried yet. Entries leave on commit success, settled eviction, registry
  /// release, or node removal - not when a hook attaches them.
  void recordSynchronousProps(const UpdatesBatch &updatesBatch);
  void collectPendingSynchronousProps(PropsMap &propsMap, const std::unordered_set<SurfaceId> *surfaceIds = nullptr);
  void clearPendingSynchronousProps(const std::unordered_set<SurfaceId> &surfaceIds);
  /// Removes only the given keys - values other registries own stay pending.
  void clearPendingSynchronousProps(Tag tag, const folly::dynamic &props);
  bool hasPendingSynchronousProps(Tag tag) const;
  /// Changes with every pending-store change.
  uint64_t pendingSynchronousPropsVersion() const;

#ifdef ANDROID
  bool hasPropsToRevert();
  void collectPropsToRevertBySurface(std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  void clearPropsToRevert(SurfaceId surfaceId);
#endif

 private:
  using RemovableShadowNodes = std::unordered_map<Tag, ShadowNodeFamily::Shared>;

  using PendingSynchronousProps = std::unordered_map<Tag, std::pair<ShadowNodeFamily::Shared, folly::dynamic>>;

  mutable std::mutex mutex_;
  std::atomic<bool> isPaused_;
  PendingSynchronousProps pendingSynchronousProps_;
  uint64_t pendingSynchronousPropsVersion_ = 0;
  std::atomic<bool> shouldCommitAfterPause_;
  RemovableShadowNodes removableShadowNodes_;
  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  static void
  addToPropsMap(PropsMap &propsMap, const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props);
#endif
};

} // namespace reanimated
