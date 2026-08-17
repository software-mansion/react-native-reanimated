#pragma once

#include <react/renderer/core/ReactPrimitives.h>
#include <react/renderer/graphics/Rect.h>

#include <cstdint>
#include <functional>
#include <optional>

namespace reanimated {

using PostMountObserver = std::function<void(facebook::react::SurfaceId)>;

struct MountedViewState {
  // Mounted host frame in the parent's coordinates, free of any animation
  // transform.
  facebook::react::Rect frame;
  // Identity of the mounted props object; zero when the platform cannot
  // report one.
  uintptr_t propsToken{0};
};

// Layout-owned, platform-neutral mount contract. The platform calls the
// registered observer on the UI thread after it applies one mounting
// transaction for the surface and before the frame becomes visible — an
// explicit mount signal, never queue order. `mountedState` also runs on the
// UI thread and returns nullopt when the view is not mounted for the surface.
class LayoutMountBoundary {
 public:
  virtual ~LayoutMountBoundary() = default;

  virtual void setPostMountObserver(PostMountObserver observer) = 0;
  virtual std::optional<MountedViewState> mountedState(
      facebook::react::SurfaceId surfaceId,
      facebook::react::Tag tag) = 0;
};

} // namespace reanimated
