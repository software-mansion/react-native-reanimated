#include <react/debug/react_native_assert.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/NativeLayoutTracks.h>
#include <reanimated/NativeAnimations/NativeAnimationRealization.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

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

constexpr const char *ORIGIN_X_KEY = "originX";
constexpr const char *ORIGIN_Y_KEY = "originY";
constexpr const char *OPACITY_KEY = "opacity";

std::optional<LeafTarget> leafTarget(const std::string &key, const ShadowView &after) {
  const auto &mountedFrame = after.layoutMetrics.frame;
  if (key == ORIGIN_X_KEY) {
    return LeafTarget{AnimationTarget::PositionX, mountedFrame.origin.x, mountedFrame.size.width / 2};
  }
  if (key == ORIGIN_Y_KEY) {
    return LeafTarget{AnimationTarget::PositionY, mountedFrame.origin.y, mountedFrame.size.height / 2};
  }
  if (key == OPACITY_KEY && isViewKind(after) && modelHoldsOnlyProp(getViewProps(after), AnimationTarget::Opacity)) {
    return LeafTarget{AnimationTarget::Opacity, mountedOpacity(after), 0};
  }
  return std::nullopt;
}

const char *leafKey(const AnimationTarget target) {
  switch (target) {
    case AnimationTarget::PositionX:
      return ORIGIN_X_KEY;
    case AnimationTarget::PositionY:
      return ORIGIN_Y_KEY;
    case AnimationTarget::Opacity:
      return OPACITY_KEY;
    default:
      react_native_assert(false && "a layout track has a target with no leaf key");
      return "";
  }
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
makeTrack(jsi::Runtime &rt, const jsi::Object &leaf, const ShadowView &after) {
  const auto target = leafTarget(leaf.getProperty(rt, "key").asString(rt).utf8(rt), after);
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
  const auto toValue = numberOf(timing.getProperty(rt, "toValue"));
  AnimationTrack track{
      .target = target->target,
      .start = AnimationValue{initialValue.getNumber() + target->modelOffset},
      .segments =
          {{.endOffset = 1, .endValue = toValue + target->modelOffset, .timingFromPrevious = leafEasing(rt, timing)}},
      .delayMs = numberOf(timing.getProperty(rt, "delayMs")),
      .durationMs = numberOf(timing.getProperty(rt, "durationMs")),
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

LiveLayoutLeaves liveLayoutLeaves(const std::vector<TrackKey> &tracks) {
  LiveLayoutLeaves leaves;
  leaves.reserve(tracks.size());
  for (const auto &track : tracks) {
    leaves.push_back({track.handle.generation, leafKey(track.target)});
  }
  return leaves;
}

LiveLeafValues liveLeafValues(jsi::Runtime &rt, const jsi::Object &leafValues) {
  const auto valueOf = [&](const char *key) -> std::optional<double> {
    const auto value = leafValues.getProperty(rt, key);
    return value.isNumber() ? std::optional(value.getNumber()) : std::nullopt;
  };
  return {valueOf(ORIGIN_X_KEY), valueOf(ORIGIN_Y_KEY), valueOf(OPACITY_KEY)};
}

std::variant<NativeLayoutTracks, TrackBuildFailure> makeNativeLayoutTracks(
    jsi::Runtime &rt,
    const jsi::Object &buildSummary,
    const ShadowView &before,
    const ShadowView &after) {
  ReanimatedSystraceSection section("makeNativeLayoutTracks");
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
    const auto leaf = leaves.getValueAtIndex(rt, index).asObject(rt);
    auto track = makeTrack(rt, leaf, after);
    if (const auto *failure = std::get_if<TrackBuildFailure>(&track)) {
      return *failure;
    }
    if (!leaf.getProperty(rt, "continuesLiveLeaf").asBool()) {
      result.tracks.push_back(std::get<AnimationTrack>(std::move(track)));
    }
  }
  if (buildSummary.getProperty(rt, "needsFrameDriver").asBool() || result.tracks.empty()) {
    return TrackBuildFailure::UnsupportedContinuation;
  }
  return result;
}

} // namespace reanimated
