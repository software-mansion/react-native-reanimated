#pragma once

#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/registries/StaticPropsRegistry.h>

#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <atomic>
#include <functional>
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
  /// Tags for which every commit carries pending values, because the
  /// mounting layer reads their shadow props for animations.
  void alwaysCarryPendingPropsFor(std::function<bool(Tag)> predicate);
  /// Puts pending values before the values a commit already holds for a
  /// family, so the commit's own values win. A pending family outside the
  /// map joins it when an ancestor is in the map, because a changed ancestor
  /// can reparent the node natively. With `includeUntouchedFamilies` every
  /// pending family of the surface joins.
  void attachPendingSynchronousProps(PropsMap &propsMap, const RootShadowNode &oldRoot, bool includeUntouchedFamilies);
  /// Pending values of nodes that `newRoot` gives new props, a new parent,
  /// a new index or an ancestor with new props. Other nodes keep their props
  /// object, and mounting does not write to them.
  void collectPendingSynchronousPropsForChangedNodes(
      PropsMap &propsMap,
      const RootShadowNode &oldRoot,
      const RootShadowNode &newRoot);
  /// Clears keys up to `committedVersion` for the families a commit carried.
  void clearPendingSynchronousProps(SurfaceId surfaceId, const PropsMap &carriedProps, uint64_t committedVersion);
  /// Removes only the given keys - values other registries own stay pending.
  void clearPendingSynchronousProps(Tag tag, const folly::dynamic &props);
  bool hasPendingSynchronousProps(Tag tag) const;
  /// Changes with every pending-store change.
  uint64_t pendingSynchronousPropsVersion(SurfaceId surfaceId) const;
  std::unordered_set<SurfaceId> pendingSynchronousSurfaces() const;
  /// Returns true if the commit covers all pending updates.
  bool recordReactCommit(const RootShadowNode::Shared &root, const PropsMap &propsMap);
  void acknowledgeReactCommit(const RootShadowNode &root);
  void removeSurface(SurfaceId surfaceId);

#ifdef ANDROID
  bool hasPropsToRevert();
  void collectPropsToRevertBySurface(std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  void clearPropsToRevert(SurfaceId surfaceId);
#endif

 private:
  using RemovableShadowNodes = std::unordered_map<Tag, ShadowNodeFamily::Shared>;

  struct ReactCommitReceipt {
    std::weak_ptr<const Props> props;
    uint64_t version;
    std::unordered_set<std::string> keys;
  };

  struct PendingSynchronousProps {
    ShadowNodeFamily::Shared family;
    folly::dynamic props = folly::dynamic::object();
    std::unordered_map<std::string, uint64_t> versions;
    std::vector<ReactCommitReceipt> reactCommits;
  };

  struct PendingSynchronousSurface {
    std::unordered_map<Tag, PendingSynchronousProps> updates;
    uint64_t version = 0;
    bool hasReactCommits = false;
  };

  void removePendingSynchronousProps(const ShadowNodeFamily &family);
  bool alwaysCarriesPendingProps(Tag tag) const;
  /// A carried node gets new props and can reparent its descendants, so
  /// their pending values ride along.
  static void attachPendingDescendants(
      PropsMap &propsMap,
      const std::unordered_map<Tag, PendingSynchronousProps> &updates,
      const ShadowNode &node,
      size_t &budget,
      size_t &remaining);

  mutable std::mutex mutex_;
  std::function<bool(Tag)> alwaysCarryPendingPropsFor_;
  std::atomic<bool> isPaused_;
  std::unordered_map<SurfaceId, PendingSynchronousSurface> pendingSynchronousProps_;
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
