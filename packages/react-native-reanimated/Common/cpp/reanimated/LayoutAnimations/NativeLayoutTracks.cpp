#include <react/debug/react_native_assert.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/NativeLayoutTracks.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <cmath>
#include <optional>
#include <string>
#include <utility>

namespace reanimated {

using namespace facebook;
using namespace native_animation;

namespace {

/// How one layout animation key maps to a native target of the view.
struct LeafTarget {
  AnimationTarget target;
  /// The model value of the target is the key value plus this offset.
  double modelOffset;
};

constexpr const char *ORIGIN_X_KEY = "originX";
constexpr const char *ORIGIN_Y_KEY = "originY";
constexpr const char *WIDTH_KEY = "width";
constexpr const char *HEIGHT_KEY = "height";
constexpr const char *OPACITY_KEY = "opacity";

std::optional<LeafTarget> leafTarget(const std::string &key, const ShadowView &after) {
  const auto &mountedSize = after.layoutMetrics.frame.size;
  if (key == ORIGIN_X_KEY) {
    return LeafTarget{AnimationTarget::PositionX, mountedSize.width / 2};
  }
  if (key == ORIGIN_Y_KEY) {
    return LeafTarget{AnimationTarget::PositionY, mountedSize.height / 2};
  }
  if (key == WIDTH_KEY) {
    return LeafTarget{AnimationTarget::Width, 0};
  }
  if (key == HEIGHT_KEY) {
    return LeafTarget{AnimationTarget::Height, 0};
  }
  if (key == OPACITY_KEY && isViewKind(after)) {
    return LeafTarget{AnimationTarget::Opacity, 0};
  }
  return std::nullopt;
}

const char *leafKey(const AnimationTarget target) {
  switch (target) {
    case AnimationTarget::PositionX:
      return ORIGIN_X_KEY;
    case AnimationTarget::PositionY:
      return ORIGIN_Y_KEY;
    case AnimationTarget::Width:
      return WIDTH_KEY;
    case AnimationTarget::Height:
      return HEIGHT_KEY;
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
makeTrack(jsi::Runtime &rt, const jsi::Object &leaf, const ShadowView &after, const NativeAnimationHost &host) {
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
  if (!host.canRealize(track, after)) {
    return TrackBuildFailure::UnsupportedTarget;
  }
  if (std::abs(toValue - leafValue(target->target, after)) > ENDPOINT_TOLERANCE) {
    return TrackBuildFailure::EndpointMismatch;
  }
  return track;
}

} // namespace

double leafValue(const AnimationTarget target, const ShadowView &view) {
  const auto &frame = view.layoutMetrics.frame;
  switch (target) {
    case AnimationTarget::PositionX:
      return frame.origin.x;
    case AnimationTarget::PositionY:
      return frame.origin.y;
    case AnimationTarget::Width:
      return frame.size.width;
    case AnimationTarget::Height:
      return frame.size.height;
    case AnimationTarget::Opacity:
      return getViewProps(view).opacity;
    default:
      react_native_assert(false && "a layout track has a target with no leaf key");
      return 0;
  }
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
  return {valueOf(ORIGIN_X_KEY), valueOf(ORIGIN_Y_KEY), valueOf(WIDTH_KEY), valueOf(HEIGHT_KEY), valueOf(OPACITY_KEY)};
}

std::variant<NativeLayoutTracks, TrackBuildFailure> makeNativeLayoutTracks(
    jsi::Runtime &rt,
    const jsi::Object &buildSummary,
    const ShadowView &after,
    const NativeAnimationHost &host) {
  ReanimatedSystraceSection section("makeNativeLayoutTracks");
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
    auto track = makeTrack(rt, leaf, after, host);
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
