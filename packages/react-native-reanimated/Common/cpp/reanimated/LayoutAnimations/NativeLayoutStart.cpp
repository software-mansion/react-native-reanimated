#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/NativeLayoutStart.h>

namespace reanimated {

using namespace native_animation;

AnimationPoint mountedPosition(const facebook::react::ShadowView &view) {
  const auto &frame = view.layoutMetrics.frame;
  return {frame.origin.x + frame.size.width / 2, frame.origin.y + frame.size.height / 2};
}

double mountedOpacity(const facebook::react::ShadowView &view) {
  return getViewProps(view).opacity;
}

#ifndef NDEBUG
namespace {

AnimationTrack makeLinearTrack(
    const ArmedNativeLayoutStart &armedStart,
    const AnimationTarget target,
    const AnimationValue &valueBeforeMount,
    const AnimationValue &endValue) {
  return {
      .target = target,
      .start = VisualValueIfInterrupting{valueBeforeMount},
      .segments = {{.endOffset = 1, .endValue = endValue, .timingFromPrevious = LinearTiming{}}},
      .delayMs = armedStart.delayMs,
      .durationMs = armedStart.durationMs,
      .endpointPolicy = EndpointPolicy::MountedModelMustMatchEndpoint,
  };
}

} // namespace

std::vector<AnimationTrack> makeTracks(
    const ArmedNativeLayoutStart &armedStart,
    const facebook::react::ShadowView &before,
    const facebook::react::ShadowView &after) {
  std::vector<AnimationTrack> tracks;
  tracks.push_back(
      makeLinearTrack(armedStart, AnimationTarget::Position, mountedPosition(before), mountedPosition(after)));
  if (armedStart.animatesOpacity) {
    tracks.push_back(
        makeLinearTrack(armedStart, AnimationTarget::Opacity, mountedOpacity(before), mountedOpacity(after)));
  }
  return tracks;
}
#endif

} // namespace reanimated
