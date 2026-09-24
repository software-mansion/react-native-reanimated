#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/ShadowNodeFamily.h>

#include <atomic>
#include <cstdint>
#include <deque>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <vector>

using namespace facebook::react;

namespace reanimated {

// A React commit takes its animated values from the registries in the commit hook, but the platform can mount it
// after newer synchronous writes. This class keeps the views with such writes until every such commit is mounted, so
// that the platform can write their current values again after a mount.
class SynchronousWritesTracker {
 public:
  // `reportedRootIsMounted` is true on a platform that reports a mount only after the mount items of the reported
  // root ran.
  explicit SynchronousWritesTracker(bool reportedRootIsMounted);

  void onCommit(const RootShadowNode::Shared &rootShadowNode, bool carriesRegistryValues);
  void onSynchronousWrite(const UpdatesBatch &synchronousUpdatesBatch);
  void onMountReport(const RootShadowNode::Shared &mountedRootShadowNode);
  void onSurfaceStop(SurfaceId surfaceId);
  bool hasWorkForMountCallback() const;
  std::vector<ShadowNodeFamily::Shared> getFamiliesToRewrite() const;
  void onRewrite();

 private:
  using Epoch = uint64_t;

  struct CommittedRoot {
    std::weak_ptr<const RootShadowNode> rootShadowNode;
    Epoch epoch;
  };

  struct Write {
    ShadowNodeFamily::Shared shadowNodeFamily;
    Epoch epoch;
  };

  struct Surface {
    // Number of commits that carried registry values. A write with epoch N is newer than the values in commits 1..N.
    Epoch epoch{0};
    // A mount report can show a commit before its mount items run. The rewrite after the report covers them.
    Epoch reportedEpoch{0};
    Epoch mountedEpoch{0};
    std::deque<CommittedRoot> committedRoots;
    std::unordered_map<Tag, Write> writes;
  };

  static bool hasUnmountedRoot(const std::deque<CommittedRoot> &committedRoots);
  static void settle(Surface &surface);
  void refreshWorkFlag();

  const bool reportedRootIsMounted_;
  std::atomic<bool> hasWorkForMountCallback_{false};
  mutable std::mutex mutex_;
  std::unordered_map<SurfaceId, Surface> surfaces_;
};

} // namespace reanimated
