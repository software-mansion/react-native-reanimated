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

std::variant<AnimationValue, TrackBuildFailure> transformOf(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject() || !value.getObject(rt).isArray(rt)) {
    return TrackBuildFailure::UnsupportedValue;
  }
  const auto operations = value.getObject(rt).getArray(rt);
  const auto count = operations.size(rt);
  AnimationTransform transform;
  transform.operations.reserve(count);
  for (size_t index = 0; index < count; ++index) {
    const auto operation = operations.getValueAtIndex(rt, index).asObject(rt);
    const auto kind = operation.getProperty(rt, "kind").asString(rt).utf8(rt);
    const auto name = std::ranges::find_if(
        OPERATION_NAMES, [&kind](const OperationName &operationName) { return kind == operationName.name; });
    if (name == OPERATION_NAMES.end()) {
      return TrackBuildFailure::UnsupportedValue;
    }
    transform.operations.push_back({name->kind, numberOf(operation.getProperty(rt, "value"))});
  }
  return transform;
}

/// The native value of a leaf value of the build summary on the view that the commit leaves.
std::variant<AnimationValue, TrackBuildFailure>
nativeValue(jsi::Runtime &rt, const jsi::Value &value, const AnimationTarget target, const ShadowView &after) {
  if (target == AnimationTarget::Transform) {
    return transformOf(rt, value);
  }
  if (!value.isNumber()) {
    return TrackBuildFailure::UnsupportedValue;
  }
  return AnimationValue{value.getNumber() + modelOffset(target, after)};
}

std::variant<AnimationTrack, TrackBuildFailure>
makeTrack(jsi::Runtime &rt, const jsi::Object &leaf, const ShadowView &after, const NativeAnimationHost &host) {
  const auto target = leafTarget(leaf.getProperty(rt, "key").asString(rt).utf8(rt), after);
  if (!target) {
    return TrackBuildFailure::UnsupportedTarget;
  }
  auto start = nativeValue(rt, leaf.getProperty(rt, "initialValue"), *target, after);
  if (const auto *failure = std::get_if<TrackBuildFailure>(&start)) {
    return *failure;
  }
  const auto timingValue = leaf.getProperty(rt, "timing");
  if (!timingValue.isObject()) {
    return TrackBuildFailure::UnsupportedTiming;
  }
  const auto timing = timingValue.asObject(rt);
  auto end = nativeValue(rt, timing.getProperty(rt, "toValue"), *target, after);
  if (const auto *failure = std::get_if<TrackBuildFailure>(&end)) {
    return *failure;
  }
  AnimationTrack track{
      .target = *target,
      .start = std::get<AnimationValue>(std::move(start)),
      .segments =
          {{.endOffset = 1,
            .endValue = std::get<AnimationValue>(std::move(end)),
            .timingFromPrevious = leafEasing(rt, timing)}},
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
  const auto &end = track.segments.back().endValue;
  const auto mounted = leafValue(track.target, view);
  if (const auto *matrix = std::get_if<facebook::react::Transform>(&mounted)) {
    return isSameMatrix(matrixOf(std::get<AnimationTransform>(end)), *matrix);
  }
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
