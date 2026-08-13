#pragma once

#include <react/renderer/core/ReactPrimitives.h>

#include <mutex>
#include <unordered_set>

namespace reanimated {

// Tracks surfaces that already have the LayoutAnimations mounting override
// delegate registered. The commit hook adds, the mount hook removes on unmount.
class ReanimatedSurfaceTracker {
 public:
  // Returns true if the surface wasn't tracked yet.
  bool add(facebook::react::SurfaceId surfaceId) {
    std::lock_guard<std::mutex> lock(mutex_);
    return seenSurfaces_.insert(surfaceId).second;
  }

  void remove(facebook::react::SurfaceId surfaceId) {
    std::lock_guard<std::mutex> lock(mutex_);
    seenSurfaces_.erase(surfaceId);
  }

 private:
  std::mutex mutex_;
  std::unordered_set<facebook::react::SurfaceId> seenSurfaces_;
};

} // namespace reanimated
