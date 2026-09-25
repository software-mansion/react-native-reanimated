#pragma once

#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/ShadowNodeFamily.h>

#include <cstdint>
#include <deque>
#include <memory>
#include <mutex>
#include <thread>
#include <unordered_map>
#include <vector>

using namespace facebook::react;

namespace reanimated {

// A React commit takes its animated values from the registries in the commit hook, but the platform can mount it
// after newer synchronous writes. This class keeps the views with such writes until every such commit is mounted, so
// that the platform can write their current values again after a mount.
class SynchronousWritesTracker {
 public:
  void onWillCommit(const RootShadowNode::Shared &rootShadowNode, bool carriesRegistryValues);
  void onDidCommit(const RootShadowNode::Shared &rootShadowNode);
  void onSynchronousWrite(const UpdatesBatch &synchronousUpdatesBatch);
  void onMountReport(const RootShadowNode::Shared &mountedRootShadowNode);
  void onSurfaceStop(SurfaceId surfaceId);
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

  struct PendingCommit {
    SurfaceId surfaceId;
    Epoch epoch;
  };

  struct Surface {
    // Number of commits that carried registry values. A write with epoch N is newer than the values in commits 1..N.
    Epoch epoch{0};
    // Android reports a mount at the pull, before the mount items run. The next mount callback writes the props
    // again. That callback also runs for a dispatch that has only view commands. If such a dispatch runs before the
    // mount items, the tracker removes the writes too early. The old value then stays on screen until the next
    // synchronous write.
    Epoch reportedEpoch{0};
    Epoch mountedEpoch{0};
    std::deque<CommittedRoot> committedRoots;
    std::unordered_map<Tag, Write> writes;
  };

  static void rememberRoot(Surface &surface, const RootShadowNode::Shared &rootShadowNode, Epoch epoch);

  mutable std::mutex mutex_;
  // One thread runs the two commit callbacks of one commit. This map holds the epoch between them.
  std::unordered_map<std::thread::id, PendingCommit> pendingCommits_;
  std::unordered_map<SurfaceId, Surface> surfaces_;
};

} // namespace reanimated
