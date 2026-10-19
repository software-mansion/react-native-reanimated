#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <reanimated/android/NativeAnimations/AndroidNativeAnimationPlatform.h>

#include <react/debug/react_native_assert.h>
#include <react/renderer/uimanager/UIManager.h>

#include <android/api-level.h>

#include <algorithm>
#include <cstdint>
#include <string>
#include <utility>
#include <variant>
#include <vector>

namespace reanimated::native_animation {

namespace {

/// The start forms that `TrackBufferParser.kt` reads.
enum class EncodedStart : jint {
  Value,
  CurrentVisualValue,
  VisualValueIfInterrupting,
};

/// The values of the C++ enums that `TrackEncoding.kt` repeats.
static_assert(static_cast<int>(AnimationTarget::Opacity) == 0);
static_assert(static_cast<int>(AnimationTarget::BackgroundColor) == 7);
static_assert(static_cast<int>(AnimationTarget::BorderColor) == 8);
static_assert(static_cast<int>(AnimationTarget::BorderRadius) == 9);
static_assert(static_cast<int>(AnimationTarget::ShadowColor) == 10);
static_assert(static_cast<int>(EndpointPolicy::HoldWithoutCommit) == 2);
static_assert(static_cast<int>(EncodedStart::Value) == 0);
static_assert(static_cast<int>(EncodedStart::CurrentVisualValue) == 1);
static_assert(static_cast<int>(AnimationTimingKind::CubicBezier) == 1);
static_assert(static_cast<int>(AnimationTimingKind::Steps) == 2);
static_assert(static_cast<int>(AnimationTimingKind::LinearStops) == 3);
static_assert(static_cast<int>(TrackStopMode::SettleToModel) == 0);
static_assert(static_cast<int>(AnimationResultReason::UnsupportedRealization) == 4);
static_assert(static_cast<int>(AnimationResultReason::CurrentValueUnavailable) == 5);

/// Each value that `plays` admits has one component: a scalar or a packed color.
constexpr jint kValueComponentCount = 1;

/// The executor writes scalars and colors only: `plays` admits no other target.
struct EncodedValueVisitor {
  double operator()(const double scalar) const {
    return scalar;
  }
  double operator()(const AnimationColor &color) const {
    return packedColorOf(color);
  }
  double operator()(const AnimationPoint &) const {
    react_native_assert(false && "[Reanimated] The Android executor has no writer for a point");
    return 0;
  }
  double operator()(const AnimationSize &) const {
    react_native_assert(false && "[Reanimated] The Android executor has no writer for a size");
    return 0;
  }
};

double encodedValueOf(const AnimationValue &value) {
  return std::visit(EncodedValueVisitor{}, value);
}

struct EncodedTrackBuffers {
  std::vector<int> ints;
  std::vector<double> doubles;
};

struct StartEncoder {
  EncodedTrackBuffers &buffers;

  void operator()(const AnimationValue &value) const {
    buffers.ints.push_back(static_cast<jint>(EncodedStart::Value));
    buffers.doubles.push_back(encodedValueOf(value));
  }
  void operator()(const CurrentVisualValue &) const {
    buffers.ints.push_back(static_cast<jint>(EncodedStart::CurrentVisualValue));
    buffers.doubles.push_back(0);
  }
  void operator()(const VisualValueIfInterrupting &start) const {
    buffers.ints.push_back(static_cast<jint>(EncodedStart::VisualValueIfInterrupting));
    buffers.doubles.push_back(encodedValueOf(start.otherwise));
  }
};

void appendPoints(
    EncodedTrackBuffers &buffers,
    const std::vector<double> &pointsX,
    const std::vector<double> &pointsY) {
  buffers.ints.push_back(static_cast<jint>(pointsX.size()));
  for (size_t index = 0; index < pointsX.size(); ++index) {
    buffers.doubles.push_back(pointsX[index]);
    buffers.doubles.push_back(pointsY[index]);
  }
}

struct TimingEncoder {
  EncodedTrackBuffers &buffers;

  void operator()(const LinearTiming &) const {
    buffers.ints.push_back(0);
  }
  void operator()(const CubicBezierTiming &bezier) const {
    appendPoints(buffers, {bezier.x1, bezier.x2}, {bezier.y1, bezier.y2});
  }
  void operator()(const StepsTiming &steps) const {
    appendPoints(buffers, steps.pointsX, steps.pointsY);
  }
  void operator()(const LinearStopsTiming &stops) const {
    appendPoints(buffers, stops.pointsX, stops.pointsY);
  }
};

/// The layout that `TrackBufferParser.kt` reads. Ints: the track count, then for each track the target, the
/// endpoint policy, the start form, the value component count, and the segment count, then for
/// each segment the timing kind and the point count. Doubles: for each track the delay, the duration, and the
/// components of the start value, then for each segment the end offset, the components of the end value, and the
/// x and y of each timing point.
EncodedTrackBuffers encodeTracks(const std::vector<AnimationTrack> &tracks) {
  EncodedTrackBuffers buffers;
  buffers.ints.push_back(static_cast<jint>(tracks.size()));
  for (const auto &track : tracks) {
    const auto &timeline = std::get<ValueTimeline>(track.body);
    buffers.ints.push_back(static_cast<jint>(track.target));
    buffers.ints.push_back(static_cast<jint>(track.endpointPolicy));
    buffers.doubles.push_back(track.delayMs);
    buffers.doubles.push_back(track.durationMs);
    std::visit(StartEncoder{buffers}, timeline.start);
    buffers.ints.push_back(kValueComponentCount);
    buffers.ints.push_back(static_cast<jint>(timeline.segments.size()));
    for (const auto &segment : timeline.segments) {
      buffers.ints.push_back(static_cast<jint>(kindOf(segment.timingFromPrevious)));
      buffers.doubles.push_back(segment.endOffset);
      buffers.doubles.push_back(encodedValueOf(segment.endValue));
      std::visit(TimingEncoder{buffers}, segment.timingFromPrevious);
    }
  }
  return buffers;
}

local_ref<JArrayInt> toJavaInts(const std::vector<int> &values) {
  auto array = JArrayInt::newArray(values.size());
  array->setRegion(0, static_cast<jsize>(values.size()), values.data());
  return array;
}

local_ref<JArrayDouble> toJavaDoubles(const std::vector<double> &values) {
  auto array = JArrayDouble::newArray(values.size());
  array->setRegion(0, static_cast<jsize>(values.size()), values.data());
  return array;
}

local_ref<JArrayInt> toJavaTargets(const std::vector<AnimationTarget> &targets) {
  std::vector<int> values;
  values.reserve(targets.size());
  for (const auto target : targets) {
    values.push_back(static_cast<jint>(target));
  }
  return toJavaInts(values);
}

/// Five values for each key: surface, tag, owner, generation, target.
constexpr size_t kTrackKeyLength = 5;

local_ref<JArrayLong> toJavaTrackKeys(const std::vector<TrackKey> &tracks) {
  std::vector<jlong> values;
  values.reserve(tracks.size() * kTrackKeyLength);
  for (const auto &[handle, target] : tracks) {
    values.push_back(handle.surfaceId);
    values.push_back(handle.tag);
    values.push_back(static_cast<jlong>(handle.owner));
    values.push_back(static_cast<jlong>(handle.generation));
    values.push_back(static_cast<jlong>(target));
  }
  auto array = JArrayLong::newArray(values.size());
  array->setRegion(0, static_cast<jsize>(values.size()), values.data());
  return array;
}

/// Sets the time of a platform pass for its operations, and clears it at the end of the pass.
class PassScope {
 public:
  PassScope(std::optional<double> &passTimestampMs, const double nowMs) : passTimestampMs_(passTimestampMs) {
    passTimestampMs_ = nowMs;
  }
  ~PassScope() {
    passTimestampMs_.reset();
  }
  PassScope(const PassScope &) = delete;
  PassScope &operator=(const PassScope &) = delete;

 private:
  std::optional<double> &passTimestampMs_;
};

class AndroidMountedAnimation final : public MountedAnimation {
 public:
  AndroidMountedAnimation(
      alias_ref<JNativeAnimationExecutor::javaobject> executor,
      global_ref<JView::javaobject> view,
      const AnimationRequest &request,
      const double elapsedMs)
      : executor_(executor), view_(std::move(view)), request_(request), elapsedMs_(elapsedMs) {}

  std::optional<AnimationResultReason> prepare(const std::vector<AnimationTarget> &interruptedTargets) override {
    ReanimatedSystraceSection section("AndroidMountedAnimation::prepare");
    const auto &handle = request_.handle;
    const auto buffers = encodeTracks(request_.tracks);
    const auto preparation = executor_->prepare(
        view_,
        handle.surfaceId,
        handle.tag,
        static_cast<jint>(handle.owner),
        static_cast<jlong>(handle.generation),
        elapsedMs_,
        toJavaTargets(interruptedTargets),
        toJavaInts(buffers.ints),
        toJavaDoubles(buffers.doubles));
    if (preparation->isInstanceOf(JPreparedPlayback::javaClassStatic())) {
      playback_ = make_global(static_ref_cast<JPreparedPlayback::javaobject>(preparation));
      return std::nullopt;
    }
    return static_cast<AnimationResultReason>(
        static_ref_cast<JPreparationRejection::javaobject>(preparation)->reason());
  }

  void start(const std::vector<TrackKey> &replacedTracks) override {
    ReanimatedSystraceSection section("AndroidMountedAnimation::start");
    playback_->install(toJavaTrackKeys(replacedTracks));
  }

 private:
  const alias_ref<JNativeAnimationExecutor::javaobject> executor_;
  const global_ref<JView::javaobject> view_;
  const AnimationRequest &request_;
  const double elapsedMs_;
  global_ref<JPreparedPlayback::javaobject> playback_;
};

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
std::vector<double> toDoubles(local_ref<JArrayDouble> array) {
  const auto size = array->size();
  std::vector<double> values(size);
  array->getRegion(0, static_cast<jsize>(size), values.data());
  return values;
}

std::vector<TrackKey> toTrackKeys(local_ref<JArrayLong> array) {
  const auto size = array->size();
  std::vector<jlong> values(size);
  array->getRegion(0, static_cast<jsize>(size), values.data());
  std::vector<TrackKey> tracks;
  for (size_t index = 0; index + kTrackKeyLength <= size; index += kTrackKeyLength) {
    const AnimationHandle handle{
        static_cast<SurfaceId>(values[index]),
        static_cast<Tag>(values[index + 1]),
        static_cast<AnimationOwner>(values[index + 2]),
        static_cast<uint64_t>(values[index + 3])};
    tracks.push_back({handle, static_cast<AnimationTarget>(values[index + 4])});
  }
  return tracks;
}

std::vector<PlaybackMember> membersOf(const JNativeAnimationSample &sample) {
  const auto property = sample.memberProperty();
  if (!property) {
    return {};
  }
  const auto componentCount = static_cast<size_t>(sample.memberComponentCount());
  const auto components = toDoubles(sample.doublesOf("memberValues"));
  PlaybackMember member{property->toStdString(), {}, toDoubles(sample.doublesOf("memberKeyTimes"))};
  for (size_t index = 0; index + componentCount <= components.size(); index += componentCount) {
    member.values.emplace_back(components.begin() + index, components.begin() + index + componentCount);
  }
  return {std::move(member)};
}
#endif

} // namespace

std::shared_ptr<AndroidNativeAnimationPlatform> AndroidNativeAnimationPlatform::create(
    alias_ref<JNativeAnimationExecutor::javaobject> executor,
    std::weak_ptr<const facebook::react::UIManager> uiManager,
    GetAnimationTimestampFunction getAnimationTimestamp) {
  auto platform = std::shared_ptr<AndroidNativeAnimationPlatform>(
      new AndroidNativeAnimationPlatform(executor, std::move(uiManager), std::move(getAnimationTimestamp)));
  executor->setCallbacks(NativeAnimationPlatformCallbacks::newObjectCxxArgs(
      [weakPlatform = platform->weak_from_this()](const TrackKey &track, const bool finished) {
        if (const auto strongPlatform = weakPlatform.lock()) {
          strongPlatform->onTrackEnded(track, finished);
        }
      },
      [weakPlatform = platform->weak_from_this()] {
        if (const auto strongPlatform = weakPlatform.lock()) {
          strongPlatform->drainPostedOperations();
        }
      }));
  return platform;
}

AndroidNativeAnimationPlatform::AndroidNativeAnimationPlatform(
    alias_ref<JNativeAnimationExecutor::javaobject> executor,
    std::weak_ptr<const facebook::react::UIManager> uiManager,
    GetAnimationTimestampFunction getAnimationTimestamp)
    : executor_(make_global(executor)),
      uiManager_(std::move(uiManager)),
      getAnimationTimestamp_(std::move(getAnimationTimestamp)),
      apiLevel_(android_get_device_api_level()) {}

int AndroidNativeAnimationPlatform::apiLevel() const {
  return apiLevel_;
}

bool AndroidNativeAnimationPlatform::animatorsEnabled() const {
  return executor_->animatorsEnabled();
}

void AndroidNativeAnimationPlatform::close() {
  const std::lock_guard lock(operationsMutex_);
  isClosed_ = true;
  postedOperations_.clear();
}

void AndroidNativeAnimationPlatform::setTrackEndListener(TrackEndListener listener) {
  trackEndListener_ = std::move(listener);
}

bool AndroidNativeAnimationPlatform::canRealize(
    const AnimationTrack &track,
    const facebook::react::ShadowView & /*view*/) {
  return plays(track);
}

bool AndroidNativeAnimationPlatform::isSurfaceRunning(const SurfaceId surfaceId) {
  const auto uiManager = uiManager_.lock();
  return uiManager && uiManager->getShadowTreeRegistry().visit(surfaceId, [](const facebook::react::ShadowTree &) {});
}

bool AndroidNativeAnimationPlatform::isInWindow(const Tag tag) {
  return executor_->isInWindow(tag);
}

MountedAnimationResolution AndroidNativeAnimationPlatform::resolve(const AnimationRequest &request) {
  ReanimatedSystraceSection section("AndroidNativeAnimationPlatform::resolve");
  react_native_assert(passTimestampMs_ && "[Reanimated] A start resolves outside a platform pass");
  if (!std::ranges::all_of(request.tracks, [this](const AnimationTrack &track) { return plays(track); })) {
    return AnimationResultReason::UnsupportedRealization;
  }
  auto view = executor_->findView(request.handle.surfaceId, request.handle.tag);
  // A view that is not mounted yet gets this result too, and CSS continues the run on the loop.
  if (!view) {
    return AnimationResultReason::TargetUnavailable;
  }
  return std::make_unique<AndroidMountedAnimation>(
      executor_, make_global(view), request, *passTimestampMs_ - request.originTimestampMs);
}

void AndroidNativeAnimationPlatform::stop(const TrackKey &track, const TrackStopMode mode) {
  ReanimatedSystraceSection section("AndroidNativeAnimationPlatform::stop");
  const auto &handle = track.handle;
  executor_->stop(
      handle.surfaceId,
      handle.tag,
      static_cast<jint>(handle.owner),
      static_cast<jlong>(handle.generation),
      static_cast<jint>(track.target),
      static_cast<jint>(mode));
}

void AndroidNativeAnimationPlatform::postToUIThread(std::function<void()> operation) {
  {
    const std::lock_guard lock(operationsMutex_);
    if (isClosed_) {
      return;
    }
    postedOperations_.push_back(std::move(operation));
  }
  executor_->requestDrain();
}

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
std::optional<TargetSample> AndroidNativeAnimationPlatform::sample(const Tag tag, const AnimationTarget target) {
  const auto targetSample = executor_->sample(tag, static_cast<jint>(target));
  if (!targetSample) {
    return std::nullopt;
  }
  return TargetSample{
      toDoubles(targetSample->doublesOf("model")),
      toDoubles(targetSample->doublesOf("presentation")),
      toTrackKeys(targetSample->playbacks()),
      membersOf(*targetSample),
      false};
}
#endif

bool AndroidNativeAnimationPlatform::plays(const AnimationTrack &track) const {
  const auto *timeline = std::get_if<ValueTimeline>(&track.body);
  const auto playsTiming = [](const AnimationSegment &segment) {
    return std::ranges::find(kAnimatorTimingKinds, kindOf(segment.timingFromPrevious)) != kAnimatorTimingKinds.end();
  };
  // On Android the view property is not a model source, so the platform cannot check a mounted endpoint.
  const bool needsEndpointCheck = track.endpointPolicy == EndpointPolicy::MountedModelMustMatchEndpoint;
  return timeline != nullptr && !needsEndpointCheck && hasWriter(track.target) &&
      std::ranges::all_of(timeline->segments, playsTiming);
}

bool AndroidNativeAnimationPlatform::hasWriter(const AnimationTarget target) const {
  switch (target) {
    case AnimationTarget::Opacity:
    case AnimationTarget::BackgroundColor:
    case AnimationTarget::BorderColor:
    case AnimationTarget::BorderRadius:
      return true;
    case AnimationTarget::ShadowColor:
      return apiLevel_ >= __ANDROID_API_P__;
    default:
      return false;
  }
}

void AndroidNativeAnimationPlatform::onTrackEnded(const TrackKey &track, const bool finished) {
  {
    const std::lock_guard lock(operationsMutex_);
    if (isClosed_) {
      return;
    }
  }
  trackEndListener_(track, finished);
}

void AndroidNativeAnimationPlatform::drainPostedOperations() {
  std::deque<Operation> operations;
  {
    const std::lock_guard lock(operationsMutex_);
    if (isClosed_) {
      return;
    }
    operations.swap(postedOperations_);
  }
  if (operations.empty()) {
    return;
  }
  const PassScope pass(passTimestampMs_, getAnimationTimestamp_());
  for (const auto &operation : operations) {
    operation();
  }
}

} // namespace reanimated::native_animation
