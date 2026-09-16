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
  /// Called once JS guarantees that no further updates can arrive for the node. Evicts it
  /// right away when it has already left its mounted tree; otherwise the first mount without
  /// it does. `isNodeMounted` answers whether the family is still in the last mounted tree.
  void handleNodeDetached(Tag viewTag, const std::function<bool(const ShadowNodeFamily &)> &isNodeMounted);
  void handleNodeRemovals(const RootShadowNode &rootShadowNode);
  /// Evicts the detached marks of a surface that RN has stopped; the rest follow on detach.
  void handleSurfaceUnmount(SurfaceId surfaceId);
  PropsMap collectProps();
  void mergeRegistryProps(Tag viewTag, folly::dynamic &target);

#ifdef ANDROID
  bool hasPropsToRevert();
  void collectPropsToRevertBySurface(std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  void clearPropsToRevert(SurfaceId surfaceId);
#endif

 private:
  struct RemovableNode {
    ShadowNodeFamily::Shared family;
    /// Set once JS reports that it detached the node, so no in-flight update can re-add it.
    bool detached;
  };
  using RemovableShadowNodes = std::unordered_map<Tag, RemovableNode>;

  mutable std::mutex mutex_;
  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
  RemovableShadowNodes removableShadowNodes_;
  std::vector<std::shared_ptr<UpdatesRegistry>> registries_;
  const std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

  void evictNode(Tag viewTag);

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  static void
  addToPropsMap(PropsMap &propsMap, const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props);
#endif
};

} // namespace reanimated
