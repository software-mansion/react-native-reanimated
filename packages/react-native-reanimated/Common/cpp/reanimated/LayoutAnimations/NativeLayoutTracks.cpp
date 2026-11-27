#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/NativeLayoutTracks.h>
#include <reanimated/NativeAnimations/NativeAnimationRealization.h>

#include <cmath>
#include <optional>
#include <string>
#include <utility>

namespace reanimated {

using namespace facebook;
using namespace native_animation;

namespace {

/// The tolerance of the semantic contract for a final host value.
constexpr double ENDPOINT_TOLERANCE = 0.01;

/// How one layout animation key maps to a native target of the view.
struct LeafTarget {
  AnimationTarget target;
  /// The value of the key that the view has before the commit.
  double current;
  /// The value of the key that the mounted view has after the commit.
  double mounted;
  /// The model value of the target is the key value plus this offset.
  double modelOffset;
};

/// Layout gives sizes with a float error.
bool isSameSize(const react::Size &lhs, const react::Size &rhs) {
  return std::abs(lhs.width - rhs.width) <= ENDPOINT_TOLERANCE &&
      std::abs(lhs.height - rhs.height) <= ENDPOINT_TOLERANCE;
}

std::optional<LeafTarget> leafTarget(const std::string &key, const ShadowView &before, const ShadowView &after) {
  const auto &currentFrame = before.layoutMetrics.frame;
  const auto &mountedFrame = after.layoutMetrics.frame;
  if (key == "originX") {
    return LeafTarget{
        AnimationTarget::PositionX, currentFrame.origin.x, mountedFrame.origin.x, mountedFrame.size.width / 2};
  }
  if (key == "originY") {
    return LeafTarget{
        AnimationTarget::PositionY, currentFrame.origin.y, mountedFrame.origin.y, mountedFrame.size.height / 2};
  }
  if (key == "opacity" && isViewKind(after) && modelHoldsOnlyProp(getViewProps(after), AnimationTarget::Opacity)) {
    return LeafTarget{AnimationTarget::Opacity, mountedOpacity(before), mountedOpacity(after), 0};
  }
  return std::nullopt;
}

/// Not a number when the value is not a number, so that the track validation refuses it.
double numberOf(const jsi::Value &value) {
  return value.isNumber() ? value.getNumber() : std::nan("");
}

/// A description with no control points is linear. Control points of a wrong form are not numbers, so that
/// the track validation refuses them.
AnimationTiming leafEasing(jsi::Runtime &rt, const jsi::Object &timing) {
  const auto cubicBezier = timing.getProperty(rt, "cubicBezier");
  if (cubicBezier.isUndefined()) {
    return LinearTiming{};
  }
  if (!cubicBezier.isObject() || numberOf(cubicBezier.getObject(rt).getProperty(rt, "length")) != 4) {
    return CubicBezierTiming{std::nan(""), std::nan(""), std::nan(""), std::nan("")};
  }
  const auto controlPoints = cubicBezier.getObject(rt);
  const auto controlPoint = [&](const char *index) {
    return numberOf(controlPoints.getProperty(rt, index));
  };
  return CubicBezierTiming{controlPoint("0"), controlPoint("1"), controlPoint("2"), controlPoint("3")};
}

std::variant<AnimationTrack, TrackBuildFailure>
makeTrack(jsi::Runtime &rt, const jsi::Object &leaf, const ShadowView &before, const ShadowView &after) {
  const auto target = leafTarget(leaf.getProperty(rt, "key").asString(rt).utf8(rt), before, after);
  if (!target) {
    return TrackBuildFailure::UnsupportedTarget;
  }
  const auto initialValue = leaf.getProperty(rt, "initialValue");
  if (!initialValue.isNumber()) {
    return TrackBuildFailure::UnsupportedValue;
  }
  const auto timingValue = leaf.getProperty(rt, "timing");
  if (!timingValue.isObject()) {
    return TrackBuildFailure::UnsupportedTiming;
  }
  const auto timing = timingValue.asObject(rt);
  const auto durationMs = numberOf(timing.getProperty(rt, "durationMs"));
  // TODO (Objective 08): the form of a zero duration that holds the start value through the delay.
  if (durationMs == 0) {
    return TrackBuildFailure::UnsupportedTiming;
  }

  const auto toValue = numberOf(timing.getProperty(rt, "toValue"));
  const auto start = initialValue.getNumber();
  const AnimationValue startValue = start + target->modelOffset;
  AnimationTrack track{
      .target = target->target,
      .start =
          start == target->current ? AnimationStart{VisualValueIfInterrupting{startValue}} : AnimationStart{startValue},
      .segments =
          {{.endOffset = 1, .endValue = toValue + target->modelOffset, .timingFromPrevious = leafEasing(rt, timing)}},
      .delayMs = numberOf(timing.getProperty(rt, "delayMs")),
      .durationMs = durationMs,
      .endpointPolicy = EndpointPolicy::MountedModelMustMatchEndpoint,
  };
  if (const auto failure = validateTrack(track)) {
    return *failure;
  }
  if (std::abs(toValue - target->mounted) > ENDPOINT_TOLERANCE) {
    return TrackBuildFailure::EndpointMismatch;
  }
  return track;
}

} // namespace

AnimationPoint mountedPosition(const ShadowView &view) {
  const auto &frame = view.layoutMetrics.frame;
  return {frame.origin.x + frame.size.width / 2, frame.origin.y + frame.size.height / 2};
}

double mountedOpacity(const ShadowView &view) {
  return getViewProps(view).opacity;
}

std::variant<NativeLayoutTracks, TrackBuildFailure> makeNativeLayoutTracks(
    jsi::Runtime &rt,
    const jsi::Object &buildSummary,
    const ShadowView &before,
    const ShadowView &after) {
  // TODO (Objective 10): Size is no native target, and the model position depends on the size.
  if (!isSameSize(before.layoutMetrics.frame.size, after.layoutMetrics.frame.size)) {
    return TrackBuildFailure::UnsupportedTarget;
  }
  if (buildSummary.getProperty(rt, "exceedsLimit").asBool()) {
    return TrackBuildFailure::ResourceLimit;
  }
  const auto leaves = buildSummary.getProperty(rt, "leaves").asObject(rt).asArray(rt);
  const auto leafCount = leaves.size(rt);
  if (leafCount == 0 || buildSummary.getProperty(rt, "hasInitialOnlyKeys").asBool()) {
    return TrackBuildFailure::UnsupportedTrackForm;
  }

  NativeLayoutTracks result{buildSummary.getProperty(rt, "originMs").asNumber(), {}};
  result.tracks.reserve(leafCount);
  for (size_t index = 0; index < leafCount; ++index) {
    auto track = makeTrack(rt, leaves.getValueAtIndex(rt, index).asObject(rt), before, after);
    if (const auto *failure = std::get_if<TrackBuildFailure>(&track)) {
      return *failure;
    }
    result.tracks.push_back(std::get<AnimationTrack>(std::move(track)));
  }
  return result;
}

} // namespace reanimated
