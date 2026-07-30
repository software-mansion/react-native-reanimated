#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <array>
#include <cstdint>
#include <string>
#include <variant>
#include <vector>

namespace reanimated {

struct NativePoint {
  double x;
  double y;

  bool operator==(const NativePoint &) const = default;
};

struct NativeSize {
  double width;
  double height;

  bool operator==(const NativeSize &) const = default;
};

struct NativeMatrix4 {
  std::array<double, 16> values;

  bool operator==(const NativeMatrix4 &) const = default;
};

struct NativeColor {
  double red;
  double green;
  double blue;
  double alpha;

  bool operator==(const NativeColor &) const = default;
};

using NativeValue = std::variant<double, NativePoint, NativeSize, NativeMatrix4, NativeColor>;

enum class NativeTimingFunctionKind : uint8_t {
  Linear,
  CubicBezier,
};

struct NativeTimingFunction {
  NativeTimingFunctionKind kind{NativeTimingFunctionKind::Linear};
  std::array<double, 4> controlPoints{0, 0, 1, 1};

  bool operator==(const NativeTimingFunction &) const = default;
};

struct NativeTimingSegment {
  double startMs;
  double endMs;
  NativeValue from;
  NativeValue to;
  NativeTimingFunction easing;
};

struct NativeHoldSegment {
  double startMs;
  double endMs;
  NativeValue value;
};

enum class NativeInterpolationMode : uint8_t {
  Linear,
  Discrete,
};

struct NativeKeyframeSegment {
  std::vector<double> timesMs;
  std::vector<NativeValue> values;
  std::vector<NativeTimingFunction> segmentEasings;
  NativeInterpolationMode mode{NativeInterpolationMode::Linear};
};

using NativeAnimationSegment = std::variant<NativeTimingSegment, NativeHoldSegment, NativeKeyframeSegment>;

struct NativeAnimationTrack {
  NativeAnimationTarget target;
  std::vector<NativeAnimationSegment> segments;
};

enum class NativeAnimationRoute : uint8_t {
  Simple,
  Structured,
  Sampled,
  Legacy,
};

enum class NativeAnimationRouteReason : uint8_t {
  CanonicalSingleTiming,
  ContainsHoldOrSequence,
  RequiresSampling,
  UnsupportedProperty,
  UnsupportedValueType,
  TransformOrderingUnavailable,
  InfiniteRepeat,
  InvalidInput,
  ExecutorMissingPrimitive,
};

const char *nativeAnimationRouteName(NativeAnimationRoute route);
const char *nativeAnimationRouteReasonName(NativeAnimationRouteReason reason);

} // namespace reanimated
