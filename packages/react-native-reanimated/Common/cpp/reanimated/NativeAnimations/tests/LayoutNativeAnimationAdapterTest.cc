#include <reanimated/LayoutAnimations/LayoutNativeAnimationAdapter.h>

#include <cassert>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>
#include <utility>
#include <variant>
#include <vector>

using namespace reanimated;
using namespace reanimated::native_animation;

namespace {

// Test hosts with different physical track-form support. The same common
// input must build on each host that supports its form.
NativeTrackFormSupport fakeAppleFormSupport() {
  return {
      .linearTiming = true,
      .cubicBezierTiming = true,
      .stepsTiming = false,
      .linearStopsTiming = false,
      .maxKeyframesPerTrack = 1,
  };
}

NativeTrackFormSupport fakeAndroidFormSupport() {
  return {
      .linearTiming = true,
      .cubicBezierTiming = true,
      .stepsTiming = true,
      .linearStopsTiming = true,
      .maxKeyframesPerTrack = 64,
  };
}

LayoutNativeConversionContext appleContext(const double finalWidth = 100, const double finalHeight = 50) {
  return {finalWidth, finalHeight, fakeAppleFormSupport()};
}

LayoutNativeAnimatedProperty timingProperty(
    std::string property,
    const double initialValue,
    const double toValue,
    const double durationMs = 300,
    AnimationTiming easing = LinearTiming{},
    const double delayMs = 0) {
  LayoutNativeAnimatedProperty result;
  result.property = std::move(property);
  result.initialValue = initialValue;
  result.delayMs = delayMs;
  result.leaf = LayoutNativeTimingLeaf{toValue, durationMs, std::move(easing)};
  return result;
}

LayoutNativeAnimationBuildInput inputOf(std::vector<LayoutNativeAnimatedProperty> properties) {
  LayoutNativeAnimationBuildInput input;
  input.properties = std::move(properties);
  return input;
}

TrackBuildFailureReason failureOf(const LayoutPlanBuildResult &result) {
  assert(std::holds_alternative<TrackBuildFailure>(result));
  return std::get<TrackBuildFailure>(result).reason;
}

const AnimationPlan &planOf(const LayoutPlanBuildResult &result) {
  assert(std::holds_alternative<AnimationPlan>(result));
  return std::get<AnimationPlan>(result);
}

// A simple timing builder result creates one direct basic track for each
// supported target, with the origin channels converted to layer center
// positions through the mounted final size.
void testDirectBasicConstruction() {
  const auto result = buildLayoutNativeAnimationPlan(
      inputOf({
          timingProperty("opacity", 0, 1),
          timingProperty("originX", 10, 60, 300, CubicBezier{0.25, 0.1, 0.25, 1}),
          timingProperty("originY", 20, 40, 500, LinearTiming{}, 100),
      }),
      appleContext(100, 50));
  const auto &plan = planOf(result);
  assert(plan.tracks.size() == 3);

  const auto &opacity = plan.tracks[0];
  assert(opacity.target.kind == AnimationTargetKind::Opacity);
  assert(std::get<double>(std::get<AnimationValue>(opacity.start)) == 0);
  assert(opacity.keyframes.size() == 1);
  assert(opacity.keyframes.front().offset == 1);
  assert(std::get<double>(opacity.keyframes.front().value) == 1);
  assert(opacity.delayMs == 0 && opacity.durationMs == 300);

  const auto &positionX = plan.tracks[1];
  assert(positionX.target.kind == AnimationTargetKind::PositionX);
  assert(std::get<double>(std::get<AnimationValue>(positionX.start)) == 10 + 50);
  assert(std::get<double>(positionX.keyframes.front().value) == 60 + 50);
  assert(std::holds_alternative<CubicBezier>(positionX.keyframes.front().timingToNext));

  const auto &positionY = plan.tracks[2];
  assert(positionY.target.kind == AnimationTargetKind::PositionY);
  assert(std::get<double>(std::get<AnimationValue>(positionY.start)) == 20 + 25);
  assert(positionY.delayMs == 100 && positionY.durationMs == 500);
}

// The construction table: each target, value, timing kind, track form, delay,
// duration, and malformed numeric case returns one built track or one typed
// failure.
void testConstructionTable() {
  const auto build = [](LayoutNativeAnimatedProperty property,
                        const LayoutNativeConversionContext &context = appleContext()) {
    return buildLayoutNativeAnimationPlan(inputOf({std::move(property)}), context);
  };
  const double nan = std::numeric_limits<double>::quiet_NaN();
  const double infinity = std::numeric_limits<double>::infinity();

  // Unsupported layout targets stay frame-driven with a typed reason. Border
  // targets also fail here: this static routing layer owns the Apple border
  // restriction.
  for (const auto *property :
       {"width", "height", "transform", "backgroundColor", "borderRadius", "borderWidth", "borderColor", "unknown"}) {
    assert(failureOf(build(timingProperty(property, 0, 1))) == TrackBuildFailureReason::UnsupportedTarget);
  }

  // A property without stable structure has no native form.
  LayoutNativeAnimatedProperty unsupportedLeaf;
  unsupportedLeaf.property = "opacity";
  unsupportedLeaf.initialValue = 0;
  assert(failureOf(build(unsupportedLeaf)) == TrackBuildFailureReason::UnsupportedTrackForm);

  // A deterministic curve without common timing data needs the sampled route.
  LayoutNativeAnimatedProperty opaqueEasing = timingProperty("opacity", 0, 1);
  std::get<LayoutNativeTimingLeaf>(opaqueEasing.leaf).easing = std::nullopt;
  assert(failureOf(build(opaqueEasing)) == TrackBuildFailureReason::UnsupportedTiming);

  // Step and linear-stop timing data validate, but the fake Apple host cannot
  // realize them in the basic track form; the fake Android host can.
  const StepsTiming steps{{{0, 0}, {0.5, 0.5}, {1, 1}}};
  const LinearStopsTiming stops{{{0, 0}, {1, 1}}};
  assert(
      failureOf(build(timingProperty("opacity", 0, 1, 300, steps))) == TrackBuildFailureReason::UnsupportedTiming);
  assert(
      failureOf(build(timingProperty("opacity", 0, 1, 300, stops))) == TrackBuildFailureReason::UnsupportedTiming);
  const LayoutNativeConversionContext androidContext{100, 50, fakeAndroidFormSupport()};
  assert(std::holds_alternative<AnimationPlan>(build(timingProperty("opacity", 0, 1, 300, steps), androidContext)));
  assert(std::holds_alternative<AnimationPlan>(build(timingProperty("opacity", 0, 1, 300, stops), androidContext)));

  // Unordered timing points and out-of-range Bézier x values are invalid data.
  const StepsTiming unorderedSteps{{{0.5, 0}, {0.2, 1}}};
  assert(
      failureOf(build(timingProperty("opacity", 0, 1, 300, unorderedSteps), androidContext)) ==
      TrackBuildFailureReason::InvalidValue);
  assert(
      failureOf(build(timingProperty("opacity", 0, 1, 300, CubicBezier{-0.5, 0, 1, 1}))) ==
      TrackBuildFailureReason::InvalidValue);
  assert(
      failureOf(build(timingProperty("opacity", 0, 1, 300, CubicBezier{nan, 0, 1, 1}))) ==
      TrackBuildFailureReason::InvalidValue);

  // Malformed numeric data never becomes non-finite common data.
  assert(failureOf(build(timingProperty("opacity", nan, 1))) == TrackBuildFailureReason::InvalidValue);
  assert(failureOf(build(timingProperty("opacity", 0, infinity))) == TrackBuildFailureReason::InvalidValue);
  assert(failureOf(build(timingProperty("opacity", 0, 1, nan))) == TrackBuildFailureReason::InvalidValue);
  assert(
      failureOf(build(timingProperty("opacity", 0, 1, 300, LinearTiming{}, nan))) ==
      TrackBuildFailureReason::InvalidValue);
  LayoutNativeAnimatedProperty missingInitial = timingProperty("opacity", 0, 1);
  missingInitial.initialValue = std::nullopt;
  assert(failureOf(build(missingInitial)) == TrackBuildFailureReason::InvalidValue);

  // The adapter resolves layout delay and duration rules before the common
  // track: negatives clamp to zero and keep the animation's meaning.
  const auto clamped = build(timingProperty("opacity", 0, 1, -50, LinearTiming{}, -100));
  assert(planOf(clamped).tracks.front().delayMs == 0);
  assert(planOf(clamped).tracks.front().durationMs == 0);

  // A zero-duration track keeps its declared delay.
  const auto zeroDuration = build(timingProperty("opacity", 0, 1, 0, LinearTiming{}, 250));
  assert(planOf(zeroDuration).tracks.front().delayMs == 250);
}

// One unsupported required track routes the whole layout plan to
// frame-driven, and an initial value without a matching animation does too.
void testWholePlanRouting() {
  const auto mixed = buildLayoutNativeAnimationPlan(
      inputOf({timingProperty("opacity", 0, 1), timingProperty("width", 0, 100)}), appleContext());
  assert(failureOf(mixed) == TrackBuildFailureReason::UnsupportedTarget);

  auto withExtraInitial = inputOf({timingProperty("opacity", 0, 1)});
  withExtraInitial.hasUnanimatedInitialValues = true;
  assert(
      failureOf(buildLayoutNativeAnimationPlan(withExtraInitial, appleContext())) ==
      TrackBuildFailureReason::UnsupportedTrackForm);

  assert(
      failureOf(buildLayoutNativeAnimationPlan(inputOf({}), appleContext())) ==
      TrackBuildFailureReason::UnsupportedTrackForm);
}

// The aggregate budget rejects work before construction with a typed reason,
// at, below, and above the boundary.
void testConstructionResourceBudget() {
  LayoutNativeConversionContext context = appleContext();
  context.budget = {
      .maxTracksPerPlan = 2,
      .maxKeyframesPerPlan = 2,
      .maxTimingPointsPerPlan = 2,
      .maxEncodedScalarsPerPlan = 4,
  };
  const auto atLimit = buildLayoutNativeAnimationPlan(
      inputOf({timingProperty("opacity", 0, 1), timingProperty("originX", 0, 10)}), context);
  assert(planOf(atLimit).tracks.size() == 2);

  const auto aboveTrackLimit = buildLayoutNativeAnimationPlan(
      inputOf(
          {timingProperty("opacity", 0, 1), timingProperty("originX", 0, 10), timingProperty("originY", 0, 10)}),
      context);
  assert(failureOf(aboveTrackLimit) == TrackBuildFailureReason::ResourceLimit);

  context.budget.maxEncodedScalarsPerPlan = 3;
  const auto aboveScalarLimit = buildLayoutNativeAnimationPlan(
      inputOf({timingProperty("opacity", 0, 1), timingProperty("originX", 0, 10)}), context);
  assert(failureOf(aboveScalarLimit) == TrackBuildFailureReason::ResourceLimit);
}

// Deterministic pretty-print of a built plan. It proves the owned values,
// normalized offsets, per-track timing, and start source without any platform
// name.
void testPlanFixtureSerialization() {
  const auto result = buildLayoutNativeAnimationPlan(
      inputOf({
          timingProperty("opacity", 0, 1),
          timingProperty("originX", 10, 60, 300, CubicBezier{0.25, 0.1, 0.25, 1}, 50),
      }),
      appleContext(100, 50));
  const auto &plan = planOf(result);

  std::ostringstream fixture;
  for (const auto &track : plan.tracks) {
    fixture << "target=" << static_cast<unsigned>(track.target.kind);
    if (const auto *start = std::get_if<AnimationValue>(&track.start)) {
      fixture << " start=" << std::get<double>(*start);
    } else {
      fixture << " start=currentVisual";
    }
    fixture << " delayMs=" << track.delayMs << " durationMs=" << track.durationMs;
    for (const auto &keyframe : track.keyframes) {
      fixture << " offset=" << keyframe.offset << " value=" << std::get<double>(keyframe.value) << " timing=";
      if (std::holds_alternative<LinearTiming>(keyframe.timingToNext)) {
        fixture << "linear";
      } else if (const auto *bezier = std::get_if<CubicBezier>(&keyframe.timingToNext)) {
        fixture << "cubicBezier(" << bezier->x1 << "," << bezier->y1 << "," << bezier->x2 << "," << bezier->y2 << ")";
      }
    }
    fixture << "\n";
  }
  const auto expected =
      "target=0 start=0 delayMs=0 durationMs=300 offset=1 value=1 timing=linear\n"
      "target=2 start=60 delayMs=50 durationMs=300 offset=1 value=110 timing=cubicBezier(0.25,0.1,0.25,1)\n";
  assert(fixture.str() == expected);
  for (const auto *platformName : {"CALayer", "keyPath", "position.x", "Animator", "View"}) {
    assert(fixture.str().find(platformName) == std::string::npos);
  }
}

// A deterministic pseudo-random generator keeps every fuzz failure
// reproducible from its seed.
class Xorshift {
 public:
  explicit Xorshift(const uint64_t seed) : state_(seed) {}

  uint64_t next() {
    state_ ^= state_ << 13;
    state_ ^= state_ >> 7;
    state_ ^= state_ << 17;
    return state_;
  }

  double nextDouble() {
    switch (next() % 8) {
      case 0:
        return std::numeric_limits<double>::quiet_NaN();
      case 1:
        return std::numeric_limits<double>::infinity();
      case 2:
        return -std::numeric_limits<double>::infinity();
      case 3:
        return -1e308;
      default:
        return static_cast<double>(static_cast<int64_t>(next() % 20001) - 10000) / 7.0;
    }
  }

 private:
  uint64_t state_;
};

// The validator must survive malformed inputs without a crash, an unbounded
// allocation, or non-finite data in a built plan.
void testFuzzedConstruction() {
  constexpr uint64_t seed = 20260818;
  Xorshift random(seed);
  constexpr size_t iterations = 10000;
  const char *properties[] = {"opacity", "originX", "originY", "width", "transform", ""};

  for (size_t iteration = 0; iteration < iterations; ++iteration) {
    LayoutNativeAnimationBuildInput input;
    input.hasUnanimatedInitialValues = random.next() % 8 == 0;
    const size_t propertyCount = random.next() % 5;
    for (size_t index = 0; index < propertyCount; ++index) {
      LayoutNativeAnimatedProperty property;
      property.property = properties[random.next() % std::size(properties)];
      if (random.next() % 4 != 0) {
        property.initialValue = random.nextDouble();
      }
      property.delayMs = random.nextDouble();
      switch (random.next() % 5) {
        case 0:
          property.leaf = LayoutNativeUnsupportedLeaf{};
          break;
        case 1:
          property.leaf = LayoutNativeTimingLeaf{random.nextDouble(), random.nextDouble(), std::nullopt};
          break;
        case 2:
          property.leaf = LayoutNativeTimingLeaf{
              random.nextDouble(),
              random.nextDouble(),
              CubicBezier{random.nextDouble(), random.nextDouble(), random.nextDouble(), random.nextDouble()}};
          break;
        case 3: {
          StepsTiming steps;
          const size_t pointCount = random.next() % 6;
          for (size_t point = 0; point < pointCount; ++point) {
            steps.points.push_back({random.nextDouble(), random.nextDouble()});
          }
          property.leaf = LayoutNativeTimingLeaf{random.nextDouble(), random.nextDouble(), AnimationTiming{steps}};
          break;
        }
        default:
          property.leaf = LayoutNativeTimingLeaf{random.nextDouble(), random.nextDouble(), LinearTiming{}};
          break;
      }
      input.properties.push_back(std::move(property));
    }

    const auto result =
        buildLayoutNativeAnimationPlan(input, {random.nextDouble(), random.nextDouble(), fakeAppleFormSupport()});
    if (const auto *plan = std::get_if<AnimationPlan>(&result)) {
      assert(!plan->tracks.empty());
      assert(validateAnimationPlan(*plan) == std::nullopt && "fuzz seed 20260818 built an invalid plan");
      for (const auto &track : plan->tracks) {
        assert(std::isfinite(track.delayMs) && track.delayMs >= 0);
        assert(std::isfinite(track.durationMs) && track.durationMs >= 0);
        for (const auto &keyframe : track.keyframes) {
          assert(isFinite(keyframe.value));
        }
      }
    }
  }
}

// The same supported common input builds with the fake Apple and Android
// hosts; an Android-only timing form builds on exactly one of them.
void testCrossHostConstruction() {
  const auto shared = inputOf({timingProperty("opacity", 0, 1), timingProperty("originX", 0, 10)});
  assert(std::holds_alternative<AnimationPlan>(
      buildLayoutNativeAnimationPlan(shared, {100, 50, fakeAppleFormSupport()})));
  assert(std::holds_alternative<AnimationPlan>(
      buildLayoutNativeAnimationPlan(shared, {100, 50, fakeAndroidFormSupport()})));

  const auto stepsOnly =
      inputOf({timingProperty("opacity", 0, 1, 300, StepsTiming{{{0, 0}, {1, 1}}})});
  assert(
      failureOf(buildLayoutNativeAnimationPlan(stepsOnly, {100, 50, fakeAppleFormSupport()})) ==
      TrackBuildFailureReason::UnsupportedTiming);
  assert(std::holds_alternative<AnimationPlan>(
      buildLayoutNativeAnimationPlan(stepsOnly, {100, 50, fakeAndroidFormSupport()})));
}

} // namespace

void runLayoutNativeAnimationAdapterTests() {
  testDirectBasicConstruction();
  testConstructionTable();
  testWholePlanRouting();
  testConstructionResourceBudget();
  testPlanFixtureSerialization();
  testFuzzedConstruction();
  testCrossHostConstruction();
  std::cout << "LayoutNativeAnimationAdapterTest passed\n";
}
