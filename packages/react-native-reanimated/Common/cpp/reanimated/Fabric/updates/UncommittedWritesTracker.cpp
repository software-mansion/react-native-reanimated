#include <reanimated/Fabric/updates/UncommittedWritesTracker.h>

#include <algorithm>
#include <utility>

namespace reanimated {

namespace {

// One frame without writes is too short: the scroll events of a dragging finger do not arrive in every frame.
constexpr uint64_t FRAMES_WITHOUT_WRITES_TO_SETTLE = 4;

bool isSettled(const UncommittedWrite &write, const uint64_t frame) {
  return frame - write.lastWriteFrame >= FRAMES_WITHOUT_WRITES_TO_SETTLE;
}

uint64_t getSnapshotCount(const ReactCommitSnapshotCounts &snapshotCounts, const SurfaceId surfaceId) {
  const auto it = snapshotCounts.find(surfaceId);
  return it == snapshotCounts.end() ? 0 : it->second;
}

} // namespace

void UncommittedWritesTracker::onFrameStart() {
  frame_++;
}

void UncommittedWritesTracker::onSynchronousWrite(
    const UpdatesBatch &synchronousUpdatesBatch,
    const ReactCommitSnapshotCounts &snapshotCounts) {
  for (const auto &[shadowNodeFamily, props] : synchronousUpdatesBatch) {
    const auto snapshotCount = getSnapshotCount(snapshotCounts, shadowNodeFamily->getSurfaceId());
    const auto it = writes_.find(shadowNodeFamily->getTag());
    if (it == writes_.end()) {
      writes_.emplace(shadowNodeFamily->getTag(), UncommittedWrite{shadowNodeFamily, props, frame_, snapshotCount});
      continue;
    }
    auto &write = it->second;
    if (write.reactCommitSnapshotCount == snapshotCount) {
      write.props.update(props);
    } else {
      write.props = props;
      write.reactCommitSnapshotCount = snapshotCount;
    }
    write.lastWriteFrame = frame_;
  }
}

void UncommittedWritesTracker::forgetCommittedProps(const std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface) {
  for (const auto &[_, propsMap] : propsMapBySurface) {
    for (const auto &[shadowNodeFamily, committedPropsVector] : propsMap) {
      const auto it = writes_.find(shadowNodeFamily->getTag());
      if (it == writes_.end()) {
        continue;
      }
      auto &props = it->second.props;
      for (const auto &committedProps : committedPropsVector) {
        for (const auto &key : committedProps.keys()) {
          props.erase(key);
        }
      }
      if (props.empty()) {
        writes_.erase(it);
      }
    }
  }
}

UncommittedWrites UncommittedWritesTracker::takeSettledWrites(const ReactCommitSnapshotCounts &snapshotCounts) {
  UncommittedWrites settledWrites;
  for (auto it = writes_.begin(); it != writes_.end();) {
    auto &write = it->second;
    if (!isSettled(write, frame_)) {
      ++it;
      continue;
    }
    if (write.reactCommitSnapshotCount == getSnapshotCount(snapshotCounts, write.shadowNodeFamily->getSurfaceId())) {
      settledWrites.push_back(std::move(write));
    }
    it = writes_.erase(it);
  }
  return settledWrites;
}

bool UncommittedWritesTracker::hasSettledWrites() const {
  return std::any_of(
      writes_.begin(), writes_.end(), [this](const auto &entry) { return isSettled(entry.second, frame_); });
}

void UncommittedWritesTracker::restore(UncommittedWrites &&writes) {
  for (auto &write : writes) {
    writes_.emplace(write.shadowNodeFamily->getTag(), std::move(write));
  }
}

bool UncommittedWritesTracker::empty() const {
  return writes_.empty();
}

void appendToPropsMapBySurface(
    const UncommittedWrites &writes,
    std::unordered_map<SurfaceId, PropsMap> &propsMapBySurface) {
  for (const auto &write : writes) {
    propsMapBySurface[write.shadowNodeFamily->getSurfaceId()][write.shadowNodeFamily].push_back(write.props);
  }
}

} // namespace reanimated
