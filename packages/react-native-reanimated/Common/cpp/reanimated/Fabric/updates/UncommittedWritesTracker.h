#pragma once

#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <cstdint>
#include <unordered_map>
#include <vector>

namespace reanimated {

using namespace facebook::react;

struct UncommittedWrite {
  ShadowNodeFamily::Shared shadowNodeFamily;
  folly::dynamic props;
  uint64_t lastWriteFrame;
  uint64_t reactCommitSnapshotCount;
};

using UncommittedWrites = std::vector<UncommittedWrite>;

// Keeps the synchronous writes that the shadow tree does not have yet. A view settles when it gets no write for a few
// frames. A React commit that takes a registry snapshot after the last write of a view carries its values, so the
// tracker drops that view. Access only on the UI thread.
class UncommittedWritesTracker {
 public:
  void onFrameStart();
  void onSynchronousWrite(const UpdatesBatch &synchronousUpdatesBatch, const ReactCommitSnapshotCounts &snapshotCounts);
  void forgetCommittedProps(const std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);
  UncommittedWrites takeSettledWrites(const ReactCommitSnapshotCounts &snapshotCounts);
  bool hasSettledWrites() const;
  void restore(UncommittedWrites &&writes);
  bool empty() const;

 private:
  uint64_t frame_{0};
  std::unordered_map<Tag, UncommittedWrite> writes_;
};

void appendToPropsMapBySurface(
    const UncommittedWrites &writes,
    std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface);

} // namespace reanimated
