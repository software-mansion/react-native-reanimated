#pragma once

#include <jsi/jsi.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <optional>

namespace reanimated {

class LayoutAnimationsProxy : public facebook::react::MountingOverrideDelegate {
 public:
  LayoutAnimationsProxy() = default;
  virtual ~LayoutAnimationsProxy() = default;

  virtual std::optional<facebook::react::SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle) = 0;
  virtual std::optional<facebook::react::SurfaceId> endLayoutAnimation(int tag, bool shouldRemove) = 0;

  virtual std::optional<facebook::react::SurfaceId>
  onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward);
  virtual std::optional<facebook::react::SurfaceId> onGestureCancel();

  virtual void setForceScreenSnapshotFunction(ForceScreenSnapshotFunction function);
};

inline std::optional<facebook::react::SurfaceId> LayoutAnimationsProxy::onTransitionProgress(
    int /*tag*/,
    double /*progress*/,
    bool /*isClosing*/,
    bool /*isGoingForward*/) {
  return std::nullopt;
}

inline std::optional<facebook::react::SurfaceId> LayoutAnimationsProxy::onGestureCancel() {
  return std::nullopt;
}

inline void LayoutAnimationsProxy::setForceScreenSnapshotFunction(ForceScreenSnapshotFunction /*function*/) {}

} // namespace reanimated
