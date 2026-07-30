#include <reanimated/NativeAnimations/NativeAnimationCompilation.h>

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <optional>
#include <sstream>
#include <unordered_map>

namespace reanimated {

namespace {

constexpr size_t kMaxTracks = 64;
constexpr size_t kMaxSegmentsPerTrack = 256;
constexpr size_t kMaxKeyframesPerSegment = 10000;

std::optional<NativeAnimationTarget> targetFromName(const std::string &name) {
  static const std::unordered_map<std::string, NativeAnimationTarget> targets = {
      {"opacity", NativeAnimationTarget::Opacity},
      {"originX", NativeAnimationTarget::OriginX},
      {"originY", NativeAnimationTarget::OriginY},
      {"width", NativeAnimationTarget::Width},
      {"height", NativeAnimationTarget::Height},
      {"translateX", NativeAnimationTarget::TranslateX},
      {"translateY", NativeAnimationTarget::TranslateY},
      {"scaleX", NativeAnimationTarget::ScaleX},
      {"scaleY", NativeAnimationTarget::ScaleY},
      {"rotation", NativeAnimationTarget::Rotation},
      {"rotationX", NativeAnimationTarget::RotationX},
      {"rotationY", NativeAnimationTarget::RotationY},
      {"skewX", NativeAnimationTarget::SkewX},
      {"skewY", NativeAnimationTarget::SkewY},
      {"perspective", NativeAnimationTarget::Perspective},
  };
  const auto target = targets.find(name);
  return target == targets.end() ? std::nullopt : std::optional(target->second);
}

const char *targetName(const NativeAnimationTarget target) {
  switch (target) {
    case NativeAnimationTarget::Opacity:
      return "opacity";
    case NativeAnimationTarget::OriginX:
      return "originX";
    case NativeAnimationTarget::OriginY:
      return "originY";
    case NativeAnimationTarget::Width:
      return "width";
    case NativeAnimationTarget::Height:
      return "height";
    case NativeAnimationTarget::TranslateX:
      return "translateX";
    case NativeAnimationTarget::TranslateY:
      return "translateY";
    case NativeAnimationTarget::ScaleX:
      return "scaleX";
    case NativeAnimationTarget::ScaleY:
      return "scaleY";
    case NativeAnimationTarget::Rotation:
      return "rotation";
    case NativeAnimationTarget::RotationX:
      return "rotationX";
    case NativeAnimationTarget::RotationY:
      return "rotationY";
    case NativeAnimationTarget::SkewX:
      return "skewX";
    case NativeAnimationTarget::SkewY:
      return "skewY";
    case NativeAnimationTarget::Perspective:
      return "perspective";
    case NativeAnimationTarget::Position:
      return "position";
    case NativeAnimationTarget::BoundsSize:
      return "boundsSize";
    case NativeAnimationTarget::Transform:
      return "transform";
  }
}

bool finiteValue(const NativeValue &value) {
  return std::visit(
      [](const auto &typedValue) {
        using T = std::decay_t<decltype(typedValue)>;
        if constexpr (std::is_same_v<T, double>) {
          return std::isfinite(typedValue);
        } else if constexpr (std::is_same_v<T, NativePoint>) {
          return std::isfinite(typedValue.x) && std::isfinite(typedValue.y);
        } else if constexpr (std::is_same_v<T, NativeSize>) {
          return std::isfinite(typedValue.width) && std::isfinite(typedValue.height);
        } else if constexpr (std::is_same_v<T, NativeMatrix4>) {
          return std::all_of(typedValue.values.begin(), typedValue.values.end(), [](double element) {
            return std::isfinite(element);
          });
        } else {
          return std::isfinite(typedValue.red) && std::isfinite(typedValue.green) && std::isfinite(typedValue.blue) &&
              std::isfinite(typedValue.alpha);
        }
      },
      value);
}

bool sameValueType(const NativeValue &lhs, const NativeValue &rhs) {
  return lhs.index() == rhs.index();
}

bool validTiming(const NativeTimingFunction &timing) {
  return std::all_of(
      timing.controlPoints.begin(), timing.controlPoints.end(), [](double point) { return std::isfinite(point); });
}

bool validSegment(const NativeAnimationSegment &segment, const double totalDurationMs) {
  return std::visit(
      [totalDurationMs](const auto &typedSegment) {
        using T = std::decay_t<decltype(typedSegment)>;
        if constexpr (std::is_same_v<T, NativeTimingSegment>) {
          return std::isfinite(typedSegment.startMs) && std::isfinite(typedSegment.endMs) &&
              typedSegment.startMs >= 0 && typedSegment.endMs >= typedSegment.startMs &&
              typedSegment.endMs <= totalDurationMs && finiteValue(typedSegment.from) && finiteValue(typedSegment.to) &&
              sameValueType(typedSegment.from, typedSegment.to) && validTiming(typedSegment.easing);
        } else if constexpr (std::is_same_v<T, NativeHoldSegment>) {
          return std::isfinite(typedSegment.startMs) && std::isfinite(typedSegment.endMs) &&
              typedSegment.startMs >= 0 && typedSegment.endMs >= typedSegment.startMs &&
              typedSegment.endMs <= totalDurationMs && finiteValue(typedSegment.value);
        } else {
          if (typedSegment.timesMs.empty() || typedSegment.timesMs.size() > kMaxKeyframesPerSegment ||
              typedSegment.timesMs.size() != typedSegment.values.size() ||
              (!typedSegment.segmentEasings.empty() &&
               typedSegment.segmentEasings.size() + 1 != typedSegment.timesMs.size())) {
            return false;
          }
          for (size_t index = 0; index < typedSegment.timesMs.size(); index++) {
            if (!std::isfinite(typedSegment.timesMs[index]) || typedSegment.timesMs[index] < 0 ||
                typedSegment.timesMs[index] > totalDurationMs ||
                (index > 0 && typedSegment.timesMs[index] <= typedSegment.timesMs[index - 1]) ||
                !finiteValue(typedSegment.values[index]) ||
                (index > 0 && !sameValueType(typedSegment.values[0], typedSegment.values[index]))) {
              return false;
            }
          }
          return std::all_of(typedSegment.segmentEasings.begin(), typedSegment.segmentEasings.end(), validTiming);
        }
      },
      segment);
}

} // namespace

NativeCompilationResult compileSampledLayoutAnimation(
    const NativeLayoutAnimationDescriptor &descriptor,
    const NativeAnimationStartValueSource startValueSource,
    const NativeAnimationMountingMode mountingMode,
    const NativeAnimationLifecycle lifecycle) {
  if (!std::isfinite(descriptor.durationMs) || descriptor.durationMs < 0 || descriptor.properties.empty()) {
    return {NativeCompilationStatus::Invalid, std::nullopt, NativeAnimationRouteReason::InvalidInput};
  }

  NativeAnimationPlan plan{
      .totalDurationMs = descriptor.durationMs,
      .tracks = {},
      .route = NativeAnimationRoute::Sampled,
      .routeReason = NativeAnimationRouteReason::RequiresSampling,
      .startValueSource = startValueSource,
      .mountingMode = mountingMode,
      .lifecycle = lifecycle,
  };
  plan.tracks.reserve(descriptor.properties.size());

  for (const auto &property : descriptor.properties) {
    const auto target = targetFromName(property.keyPath);
    if (!target) {
      return {NativeCompilationStatus::Fallback, std::nullopt, NativeAnimationRouteReason::UnsupportedProperty};
    }
    if (property.offsets.empty() || property.offsets.size() != property.values.size()) {
      return {NativeCompilationStatus::Invalid, std::nullopt, NativeAnimationRouteReason::InvalidInput};
    }

    NativeKeyframeSegment segment;
    segment.timesMs.reserve(property.offsets.size());
    segment.values.reserve(property.values.size());
    for (size_t index = 0; index < property.offsets.size(); index++) {
      segment.timesMs.push_back(property.offsets[index] * descriptor.durationMs);
      segment.values.emplace_back(property.values[index]);
    }
    plan.tracks.push_back({*target, {std::move(segment)}});
  }

  return validateNativeAnimationPlan(std::move(plan));
}

NativeCompilationResult validateNativeAnimationPlan(NativeAnimationPlan plan) {
  if (!std::isfinite(plan.totalDurationMs) || plan.totalDurationMs < 0 || plan.tracks.empty() ||
      plan.tracks.size() > kMaxTracks) {
    return {NativeCompilationStatus::Invalid, std::nullopt, NativeAnimationRouteReason::InvalidInput};
  }
  for (const auto &track : plan.tracks) {
    if (track.segments.empty() || track.segments.size() > kMaxSegmentsPerTrack ||
        !std::all_of(track.segments.begin(), track.segments.end(), [&](const auto &segment) {
          return validSegment(segment, plan.totalDurationMs);
        })) {
      return {NativeCompilationStatus::Invalid, std::nullopt, NativeAnimationRouteReason::InvalidInput};
    }
    double previousEndMs = -1;
    for (const auto &segment : track.segments) {
      const auto [startMs, endMs] = std::visit(
          [](const auto &typedSegment) -> std::pair<double, double> {
            using T = std::decay_t<decltype(typedSegment)>;
            if constexpr (std::is_same_v<T, NativeKeyframeSegment>) {
              return {typedSegment.timesMs.front(), typedSegment.timesMs.back()};
            } else {
              return {typedSegment.startMs, typedSegment.endMs};
            }
          },
          segment);
      if (startMs < previousEndMs) {
        return {NativeCompilationStatus::Invalid, std::nullopt, NativeAnimationRouteReason::InvalidInput};
      }
      previousEndMs = endMs;
    }
  }

  const bool segmentsMatchRoute = std::all_of(plan.tracks.begin(), plan.tracks.end(), [&plan](const auto &track) {
    if (plan.route == NativeAnimationRoute::Simple) {
      return track.segments.size() == 1 && std::holds_alternative<NativeTimingSegment>(track.segments.front());
    }
    if (plan.route == NativeAnimationRoute::Structured) {
      return std::none_of(track.segments.begin(), track.segments.end(), [](const auto &segment) {
        return std::holds_alternative<NativeKeyframeSegment>(segment);
      });
    }
    if (plan.route == NativeAnimationRoute::Sampled) {
      return std::all_of(track.segments.begin(), track.segments.end(), [](const auto &segment) {
        return std::holds_alternative<NativeKeyframeSegment>(segment);
      });
    }
    return false;
  });
  if (!segmentsMatchRoute) {
    return {NativeCompilationStatus::Fallback, std::nullopt, NativeAnimationRouteReason::ExecutorMissingPrimitive};
  }
  const auto reason = plan.routeReason;
  return {NativeCompilationStatus::Native, std::move(plan), reason};
}

std::string serializeNativeAnimationPlan(const NativeAnimationPlan &plan) {
  std::ostringstream output;
  output << std::setprecision(17) << "{\"durationMs\":" << plan.totalDurationMs << ",\"route\":\""
         << nativeAnimationRouteName(plan.route) << "\",\"reason\":\""
         << nativeAnimationRouteReasonName(plan.routeReason) << "\",\"tracks\":[";
  for (size_t trackIndex = 0; trackIndex < plan.tracks.size(); trackIndex++) {
    if (trackIndex > 0) {
      output << ',';
    }
    const auto &track = plan.tracks[trackIndex];
    output << "{\"target\":\"" << targetName(track.target) << "\",\"segmentCount\":" << track.segments.size() << '}';
  }
  output << "]}";
  return output.str();
}

NativeLayoutAnimationDescriptor materializeSampledLayoutDescriptor(
    const NativeAnimationHandle handle,
    const NativeAnimationPlan &plan) {
  NativeLayoutAnimationDescriptor descriptor;
  descriptor.durationMs = plan.totalDurationMs;
#ifndef NDEBUG
  descriptor.traceGeneration = handle.generation;
  switch (plan.lifecycle) {
    case NativeAnimationLifecycle::Entering:
      descriptor.traceAnimationType = layout_animation_trace::AnimationType::Entering;
      break;
    case NativeAnimationLifecycle::Exiting:
      descriptor.traceAnimationType = layout_animation_trace::AnimationType::Exiting;
      break;
    case NativeAnimationLifecycle::Layout:
      descriptor.traceAnimationType = layout_animation_trace::AnimationType::Layout;
      break;
  }
#endif
  descriptor.properties.reserve(plan.tracks.size());
  for (const auto &track : plan.tracks) {
    NativeLayoutAnimationProperty property;
    property.keyPath = targetName(track.target);
    const auto appendValue = [&property, &plan](const double timeMs, const NativeValue &value) {
      const auto *scalar = std::get_if<double>(&value);
      if (scalar == nullptr) {
        return;
      }
      const double offset = plan.totalDurationMs == 0 ? 0 : timeMs / plan.totalDurationMs;
      if (!property.offsets.empty() && property.offsets.back() == offset) {
        property.values.back() = *scalar;
        return;
      }
      property.offsets.push_back(offset);
      property.values.push_back(*scalar);
    };
    for (const auto &segment : track.segments) {
      std::visit(
          [&](const auto &typedSegment) {
            using T = std::decay_t<decltype(typedSegment)>;
            if constexpr (std::is_same_v<T, NativeTimingSegment>) {
              appendValue(typedSegment.startMs, typedSegment.from);
              appendValue(typedSegment.endMs, typedSegment.to);
            } else if constexpr (std::is_same_v<T, NativeHoldSegment>) {
              appendValue(typedSegment.startMs, typedSegment.value);
              appendValue(typedSegment.endMs, typedSegment.value);
            } else {
              for (size_t index = 0; index < typedSegment.timesMs.size(); index++) {
                appendValue(typedSegment.timesMs[index], typedSegment.values[index]);
              }
            }
          },
          segment);
    }
    if (!property.values.empty()) {
      descriptor.properties.push_back(std::move(property));
    }
  }
  return descriptor;
}

} // namespace reanimated
