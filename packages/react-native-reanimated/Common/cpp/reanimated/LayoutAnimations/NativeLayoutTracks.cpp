#include <react/debug/react_native_assert.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/LayoutAnimations/NativeLayoutTracks.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <algorithm>
#include <array>
#include <cmath>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace native_animation;

namespace {

/// How one layout animation key maps to a native target of the view.
struct LeafKey {
  const char *name;
  AnimationTarget target;
};

constexpr std::array LEAF_KEYS{
    LeafKey{"originX", AnimationTarget::PositionX},
    LeafKey{"originY", AnimationTarget::PositionY},
    LeafKey{"width", AnimationTarget::Width},
    LeafKey{"height", AnimationTarget::Height},
    LeafKey{"opacity", AnimationTarget::Opacity},
    LeafKey{"transform", AnimationTarget::Transform},
};

struct OperationName {
  const char *name;
  TransformOperationKind kind;
};

constexpr std::array OPERATION_NAMES{
    OperationName{"translateX", TransformOperationKind::TranslateX},
    OperationName{"translateY", TransformOperationKind::TranslateY},
    OperationName{"scale", TransformOperationKind::Scale},
    OperationName{"scaleX", TransformOperationKind::ScaleX},
    OperationName{"scaleY", TransformOperationKind::ScaleY},
    OperationName{"rotateX", TransformOperationKind::RotateX},
    OperationName{"rotateY", TransformOperationKind::RotateY},
    OperationName{"rotateZ", TransformOperationKind::RotateZ},
    OperationName{"rotate", TransformOperationKind::RotateZ},
    OperationName{"perspective", TransformOperationKind::Perspective},
};

bool isViewProp(const AnimationTarget target) {
  return target == AnimationTarget::Opacity || target == AnimationTarget::Transform;
}

std::optional<AnimationTarget> leafTarget(const std::string &key, const ShadowView &after) {
  const auto entry = std::ranges::find_if(LEAF_KEYS, [&key](const LeafKey &leafKey) { return key == leafKey.name; });
  if (entry == LEAF_KEYS.end() || (isViewProp(entry->target) && !isViewKind(after))) {
    return std::nullopt;
  }
  return entry->target;
}

const char *leafKey(const AnimationTarget target) {
  const auto entry = std::ranges::find(LEAF_KEYS, target, &LeafKey::target);
  react_native_assert(entry != LEAF_KEYS.end() && "a layout track has a target with no leaf key");
  return entry->name;
}

/// The model value of a scalar target is the key value plus this offset.
double modelOffset(const AnimationTarget target, const ShadowView &view) {
  const auto &size = view.layoutMetrics.frame.size;
  switch (target) {
    case AnimationTarget::PositionX:
      return size.width / 2;
    case AnimationTarget::PositionY:
      return size.height / 2;
    default:
      return 0;
  }
}

/// Not a number when the value is not a number, so that the track validation refuses it.
double numberOf(const jsi::Value &value) {
  return value.isNumber() ? value.getNumber() : std::nan("");
}

/// A segment with no control points is linear. Control points of a wrong form are not numbers, so that the
/// track validation refuses them.
AnimationTiming segmentEasing(jsi::Runtime &rt, const jsi::Object &segment) {
  const auto cubicBezier = segment.getProperty(rt, "cubicBezier");
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

std::optional<TransformOperationKind> operationKind(jsi::Runtime &rt, const jsi::Object &operation) {
  const auto kind = operation.getProperty(rt, "kind").asString(rt).utf8(rt);
  const auto name = std::ranges::find_if(
      OPERATION_NAMES, [&kind](const OperationName &operationName) { return kind == operationName.name; });
  return name == OPERATION_NAMES.end() ? std::nullopt : std::optional(name->kind);
}

/// True when the initial value of the build summary is a number, or for a `transform` leaf a list of operations
/// that each have a native kind.
bool hasNativeForm(jsi::Runtime &rt, const jsi::Value &initialValue, const AnimationTarget target) {
  if (target != AnimationTarget::Transform) {
    return initialValue.isNumber();
  }
  if (!initialValue.isObject() || !initialValue.getObject(rt).isArray(rt)) {
    return false;
  }
  const auto operations = initialValue.getObject(rt).getArray(rt);
  for (size_t index = 0; index < operations.size(rt); ++index) {
    if (!operationKind(rt, operations.getValueAtIndex(rt, index).asObject(rt))) {
      return false;
    }
  }
  return true;
}

/// The segments of a timeline of numbers of the build summary. `valueOf` gives the native value of a number.
template <typename Value, typename ValueOf>
std::vector<TimelineSegment<Value>>
makeSegments(jsi::Runtime &rt, const jsi::Object &timeline, const ValueOf &valueOf) {
  const auto leafSegments = timeline.getProperty(rt, "segments").asObject(rt).asArray(rt);
  const auto count = leafSegments.size(rt);
  std::vector<TimelineSegment<Value>> segments;
  segments.reserve(count);
  for (size_t index = 0; index < count; ++index) {
    const auto leafSegment = leafSegments.getValueAtIndex(rt, index).asObject(rt);
    segments.push_back(
        {.endOffset = numberOf(leafSegment.getProperty(rt, "endOffset")),
         .endValue = valueOf(numberOf(leafSegment.getProperty(rt, "endValue"))),
         .timingFromPrevious = segmentEasing(rt, leafSegment)});
  }
  return segments;
}

std::variant<TrackBody, TrackBuildFailure> makeTransformBody(jsi::Runtime &rt, const jsi::Object &leafTrack) {
  const auto leafOperations = leafTrack.getProperty(rt, "operations").asObject(rt).asArray(rt);
  const auto count = leafOperations.size(rt);
  TransformTimelines body;
  body.operations.reserve(count);
  for (size_t index = 0; index < count; ++index) {
    const auto leafOperation = leafOperations.getValueAtIndex(rt, index).asObject(rt);
    const auto kind = operationKind(rt, leafOperation);
    if (!kind) {
      return TrackBuildFailure::UnsupportedValue;
    }
    body.operations.push_back(
        {.kind = *kind,
         .start = numberOf(leafOperation.getProperty(rt, "start")),
         .segments = makeSegments<double>(rt, leafOperation, [](const double value) { return value; })});
  }
  return body;
}

/// The value body of a scalar leaf on the view that the commit leaves.
TrackBody makeValueBody(
    jsi::Runtime &rt,
    const jsi::Object &leafTrack,
    const jsi::Value &initialValue,
    const AnimationTarget target,
    const ShadowView &after) {
  const auto nativeValue = [offset = modelOffset(target, after)](const double value) {
    return AnimationValue{value + offset};
  };
  return ValueTimeline{
      .start = nativeValue(numberOf(initialValue)),
      .segments = makeSegments<AnimationValue>(rt, leafTrack, nativeValue),
  };
}

std::variant<AnimationTrack, TrackBuildFailure> makeTrack(
    jsi::Runtime &rt,
    const jsi::Object &leaf,
    const ShadowView &after,
    const NativeAnimationHost &host,
    const EndpointPolicy endpointPolicy) {
  const auto target = leafTarget(leaf.getProperty(rt, "key").asString(rt).utf8(rt), after);
  if (!target) {
    return TrackBuildFailure::UnsupportedTarget;
  }
  const auto initialValue = leaf.getProperty(rt, "initialValue");
  if (!hasNativeForm(rt, initialValue, *target)) {
    return TrackBuildFailure::UnsupportedValue;
  }
  const auto leafTrackValue = leaf.getProperty(rt, "track");
  if (!leafTrackValue.isObject()) {
    return leaf.getProperty(rt, "hasPhaseOfNoDuration").isBool() ? TrackBuildFailure::UnsupportedTrackForm
                                                                 : TrackBuildFailure::UnsupportedTiming;
  }
  const auto leafTrack = leafTrackValue.asObject(rt);
  auto body = leafTrack.getProperty(rt, "kind").asString(rt).utf8(rt) == "transform"
      ? makeTransformBody(rt, leafTrack)
      : std::variant<TrackBody, TrackBuildFailure>(makeValueBody(rt, leafTrack, initialValue, *target, after));
  if (const auto *failure = std::get_if<TrackBuildFailure>(&body)) {
    return *failure;
  }
  AnimationTrack track{
      .target = *target,
      .body = std::get<TrackBody>(std::move(body)),
      .delayMs = numberOf(leafTrack.getProperty(rt, "delayMs")),
      .durationMs = numberOf(leafTrack.getProperty(rt, "durationMs")),
      .endpointPolicy = endpointPolicy,
  };
  if (const auto failure = validateTrack(track)) {
    return *failure;
  }
  if (!host.canRealize(track, after)) {
    return TrackBuildFailure::UnsupportedTarget;
  }
  if (endpointPolicy == EndpointPolicy::HoldWithoutCommit) {
    // The host has no playback of its own for a held track with no duration.
    return track.durationMs == 0
        ? std::variant<AnimationTrack, TrackBuildFailure>(TrackBuildFailure::UnsupportedTrackForm)
        : track;
  }
  if (!endsAtMountedValue(track, after)) {
    return TrackBuildFailure::EndpointMismatch;
  }
  return track;
}

} // namespace

LeafValue leafValue(const AnimationTarget target, const ShadowView &view) {
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
    case AnimationTarget::Transform:
      return getViewProps(view).resolveTransform(view.layoutMetrics);
    default:
      react_native_assert(false && "a layout track has a target with no leaf key");
      return 0.0;
  }
}

bool endsAtMountedValue(const AnimationTrack &track, const ShadowView &view) {
  const auto mounted = leafValue(track.target, view);
  if (const auto *body = std::get_if<TransformTimelines>(&track.body)) {
    return isSameMatrix(matrixOf(endpointsOf(*body).end), std::get<facebook::react::Transform>(mounted));
  }
  const auto &end = std::get<ValueTimeline>(track.body).segments.back().endValue;
  const auto endKeyValue = std::get<double>(end) - modelOffset(track.target, view);
  return std::abs(endKeyValue - std::get<double>(mounted)) <= ENDPOINT_TOLERANCE;
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
  const auto valueOf = [&](const AnimationTarget target) -> std::optional<double> {
    const auto value = leafValues.getProperty(rt, leafKey(target));
    return value.isNumber() ? std::optional(value.getNumber()) : std::nullopt;
  };
  const auto transform = leafValues.getProperty(rt, leafKey(AnimationTarget::Transform));
  return {
      .originX = valueOf(AnimationTarget::PositionX),
      .originY = valueOf(AnimationTarget::PositionY),
      .width = valueOf(AnimationTarget::Width),
      .height = valueOf(AnimationTarget::Height),
      .opacity = valueOf(AnimationTarget::Opacity),
      .transform = transform.isObject() ? std::optional(jsi::dynamicFromValue(rt, transform)) : std::nullopt};
}

std::variant<NativeLayoutTracks, TrackBuildFailure> makeNativeLayoutTracks(
    jsi::Runtime &rt,
    const jsi::Object &buildSummary,
    const ShadowView &after,
    const NativeAnimationHost &host,
    const EndpointPolicy endpointPolicy) {
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
    auto track = makeTrack(rt, leaf, after, host, endpointPolicy);
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
