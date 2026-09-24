#include <reanimated/Fabric/updates/SynchronousWritesTracker.h>

#include <algorithm>

namespace reanimated {

void SynchronousWritesTracker::onCommit(
    const RootShadowNode::Shared &rootShadowNode,
    const bool carriesRegistryValues) {
  auto lock = std::scoped_lock{mutex_};
  auto &surface = surfaces_[rootShadowNode->getSurfaceId()];
  if (carriesRegistryValues) {
    surface.epoch++;
  }
  auto &committedRoots = surface.committedRoots;
  while (!committedRoots.empty() && committedRoots.front().rootShadowNode.expired()) {
    committedRoots.pop_front();
  }
  committedRoots.push_back({rootShadowNode, surface.epoch});
}

void SynchronousWritesTracker::onSynchronousWrite(const UpdatesBatch &synchronousUpdatesBatch) {
  auto lock = std::scoped_lock{mutex_};
  for (const auto &[shadowNodeFamily, props] : synchronousUpdatesBatch) {
    const auto surfaceIt = surfaces_.find(shadowNodeFamily->getSurfaceId());
    if (surfaceIt == surfaces_.end() || surfaceIt->second.epoch == surfaceIt->second.mountedEpoch) {
      continue;
    }
    auto &surface = surfaceIt->second;
    surface.writes.insert_or_assign(shadowNodeFamily->getTag(), Write{shadowNodeFamily, surface.epoch});
  }
}

void SynchronousWritesTracker::onMountReport(const RootShadowNode::Shared &mountedRootShadowNode) {
  auto lock = std::scoped_lock{mutex_};
  const auto surfaceIt = surfaces_.find(mountedRootShadowNode->getSurfaceId());
  if (surfaceIt == surfaces_.end()) {
    return;
  }
  auto &surface = surfaceIt->second;
  auto &committedRoots = surface.committedRoots;
  const auto it = std::find_if(committedRoots.begin(), committedRoots.end(), [&](const CommittedRoot &root) {
    return root.rootShadowNode.lock() == mountedRootShadowNode;
  });
  if (it == committedRoots.end()) {
    return;
  }
  surface.reportedEpoch = it->epoch;
  committedRoots.erase(committedRoots.begin(), it + 1);
}

void SynchronousWritesTracker::onSurfaceStop(const SurfaceId surfaceId) {
  auto lock = std::scoped_lock{mutex_};
  surfaces_.erase(surfaceId);
}

std::vector<ShadowNodeFamily::Shared> SynchronousWritesTracker::getFamiliesToRewrite() const {
  auto lock = std::scoped_lock{mutex_};
  std::vector<ShadowNodeFamily::Shared> families;
  for (const auto &[_, surface] : surfaces_) {
    for (const auto &[tag, write] : surface.writes) {
      families.push_back(write.shadowNodeFamily);
    }
  }
  return families;
}

void SynchronousWritesTracker::onRewrite() {
  auto lock = std::scoped_lock{mutex_};
  for (auto &[_, surface] : surfaces_) {
    surface.mountedEpoch = surface.reportedEpoch;
    std::erase_if(surface.writes, [&](const auto &entry) { return entry.second.epoch <= surface.mountedEpoch; });
  }
}

} // namespace reanimated
