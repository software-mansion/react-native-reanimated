#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <reanimated/android/NativeAnimations/AndroidNativeAnimationPlatform.h>

#include <react/debug/react_native_assert.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/ShadowNodeTraits.h>
#include <react/renderer/uimanager/UIManager.h>

#include <android/api-level.h>

#include <algorithm>
#include <cmath>
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

/// How the executor binds a track to its view. `TrackEncoding.kt` repeats the values.
enum class EncodedBinding : jint {
  Writer,
  /// A track that writes no property: a constant size, or a constant geometry that the view holds.
  Hold,
};

/// The timeline of a value body has no transform operation.
constexpr jint kNoOperation = -1;

/// The values of the C++ enums that `TrackEncoding.kt` repeats.
static_assert(static_cast<int>(AnimationTarget::Opacity) == 0);
static_assert(static_cast<int>(AnimationTarget::Position) == 1);
static_assert(static_cast<int>(AnimationTarget::PositionX) == 2);
static_assert(static_cast<int>(AnimationTarget::PositionY) == 3);
static_assert(static_cast<int>(AnimationTarget::Size) == 4);
static_assert(static_cast<int>(AnimationTarget::Width) == 5);
static_assert(static_cast<int>(AnimationTarget::Height) == 6);
static_assert(static_cast<int>(AnimationTarget::BackgroundColor) == 7);
static_assert(static_cast<int>(AnimationTarget::BorderColor) == 8);
static_assert(static_cast<int>(AnimationTarget::BorderRadius) == 9);
static_assert(static_cast<int>(AnimationTarget::ShadowColor) == 10);
static_assert(static_cast<int>(AnimationTarget::Transform) == 14);
static_assert(static_cast<int>(EndpointPolicy::MountedModelMustMatchEndpoint) == 0);
static_assert(static_cast<int>(EndpointPolicy::ExecutorCommitsEndpoint) == 1);
static_assert(static_cast<int>(EndpointPolicy::HoldWithoutCommit) == 2);
static_assert(static_cast<int>(TransformOperationKind::TranslateX) == 0);
static_assert(static_cast<int>(TransformOperationKind::TranslateY) == 1);
static_assert(static_cast<int>(TransformOperationKind::Scale) == 2);
static_assert(static_cast<int>(TransformOperationKind::ScaleX) == 3);
static_assert(static_cast<int>(TransformOperationKind::ScaleY) == 4);
static_assert(static_cast<int>(TransformOperationKind::RotateZ) == 7);
static_assert(static_cast<int>(EncodedBinding::Hold) == 1);
static_assert(static_cast<int>(EncodedStart::Value) == 0);
static_assert(static_cast<int>(EncodedStart::CurrentVisualValue) == 1);
static_assert(static_cast<int>(AnimationTimingKind::CubicBezier) == 1);
static_assert(static_cast<int>(AnimationTimingKind::Steps) == 2);
static_assert(static_cast<int>(AnimationTimingKind::LinearStops) == 3);
static_assert(static_cast<int>(AnimationTimingKind::Spring) == 4);
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

struct EncodedStartValue {
  EncodedStart form;
  double value;
};

struct StartEncoder {
  EncodedStartValue operator()(const AnimationValue &value) const {
    return {EncodedStart::Value, encodedValueOf(value)};
  }
  EncodedStartValue operator()(const CurrentVisualValue &) const {
    return {EncodedStart::CurrentVisualValue, 0};
  }
  EncodedStartValue operator()(const VisualValueIfInterrupting &start) const {
    return {EncodedStart::VisualValueIfInterrupting, encodedValueOf(start.otherwise)};
  }
};

/// The x and the y of each point, in turn.
std::vector<double> pointParameters(const std::vector<double> &pointsX, const std::vector<double> &pointsY) {
  std::vector<double> parameters;
  parameters.reserve(2 * pointsX.size());
  for (size_t index = 0; index < pointsX.size(); ++index) {
    parameters.push_back(pointsX[index]);
    parameters.push_back(pointsY[index]);
  }
  return parameters;
}

struct TimingParametersVisitor {
  std::vector<double> operator()(const LinearTiming &) const {
    return {};
  }
  std::vector<double> operator()(const CubicBezierTiming &bezier) const {
    return {bezier.x1, bezier.y1, bezier.x2, bezier.y2};
  }
  std::vector<double> operator()(const StepsTiming &steps) const {
    return pointParameters(steps.pointsX, steps.pointsY);
  }
  std::vector<double> operator()(const LinearStopsTiming &stops) const {
    return pointParameters(stops.pointsX, stops.pointsY);
  }
  std::vector<double> operator()(const SpringTiming &spring) const {
    return {spring.decay, spring.frequency, spring.initialVelocity};
  }
};

void appendTimingParameters(EncodedTrackBuffers &buffers, const AnimationTiming &timing) {
  const auto parameters = std::visit(TimingParametersVisitor{}, timing);
  buffers.ints.push_back(static_cast<jint>(parameters.size()));
  buffers.doubles.insert(buffers.doubles.end(), parameters.begin(), parameters.end());
}

/// The 2D operations whose matrix `GeometryWriter.kt` composes.
bool isPlanar(const TransformOperationKind kind) {
  switch (kind) {
    case TransformOperationKind::TranslateX:
    case TransformOperationKind::TranslateY:
    case TransformOperationKind::Scale:
    case TransformOperationKind::ScaleX:
    case TransformOperationKind::ScaleY:
    case TransformOperationKind::RotateZ:
      return true;
    case TransformOperationKind::RotateX:
    case TransformOperationKind::RotateY:
    case TransformOperationKind::Perspective:
      return false;
  }
  return false;
}

bool isGeometryTarget(const AnimationTarget target) {
  return target == AnimationTarget::PositionX || target == AnimationTarget::PositionY ||
      target == AnimationTarget::Transform;
}

/// A geometry track that moves the view from its mounted geometry needs the animation matrix.
bool movesGeometry(const AnimationTrack &track) {
  return changesValue(track) || track.endpointPolicy == EndpointPolicy::HoldWithoutCommit;
}

EncodedBinding bindingOf(const AnimationTrack &track) {
  const bool isHold = isSizeTarget(track.target) || (isGeometryTarget(track.target) && !movesGeometry(track));
  return isHold ? EncodedBinding::Hold : EncodedBinding::Writer;
}

struct EncodedTimeline {
  jint operation;
  double start;
};

template <typename Value, typename EncodeValue>
void appendTimeline(
    EncodedTrackBuffers &buffers,
    const EncodedTimeline &timeline,
    const std::vector<TimelineSegment<Value>> &segments,
    const EncodeValue &encodeValue) {
  buffers.ints.push_back(timeline.operation);
  buffers.doubles.push_back(timeline.start);
  buffers.ints.push_back(static_cast<jint>(segments.size()));
  for (const auto &segment : segments) {
    buffers.ints.push_back(static_cast<jint>(kindOf(segment.timingFromPrevious)));
    buffers.doubles.push_back(segment.endOffset);
    buffers.doubles.push_back(encodeValue(segment.endValue));
    appendTimingParameters(buffers, segment.timingFromPrevious);
  }
}

void appendTrackHeader(
    EncodedTrackBuffers &buffers,
    const AnimationTrack &track,
    const EncodedStart start,
    const size_t timelineCount) {
  buffers.ints.push_back(static_cast<jint>(track.target));
  buffers.ints.push_back(static_cast<jint>(track.endpointPolicy));
  buffers.ints.push_back(static_cast<jint>(start));
  buffers.ints.push_back(static_cast<jint>(bindingOf(track)));
  buffers.ints.push_back(kValueComponentCount);
  buffers.ints.push_back(static_cast<jint>(timelineCount));
  buffers.doubles.push_back(track.delayMs);
  buffers.doubles.push_back(track.durationMs);
}

/// The layout that `TrackBufferParser.kt` reads. Ints: the track count, then for each track the target, the
/// endpoint policy, the start form, the binding, the value component count, and the timeline count, then for
/// each timeline its operation and its segment count, then for each segment the timing kind and the timing
/// parameter count. Doubles: for each track the delay and the duration, then for each timeline the components of
/// its start value, then for each segment the end offset, the components of the end value, and the timing
/// parameters: the x and the y of each point of a curve, or the decay, the frequency, and the initial velocity of
/// a spring. A value body has one timeline over the whole value; a transform body has one for each operation.
EncodedTrackBuffers encodeTracks(const std::vector<AnimationTrack> &tracks) {
  EncodedTrackBuffers buffers;
  buffers.ints.push_back(static_cast<jint>(tracks.size()));
  for (const auto &track : tracks) {
    if (const auto *body = std::get_if<TransformTimelines>(&track.body)) {
      appendTrackHeader(buffers, track, EncodedStart::Value, body->operations.size());
      for (const auto &operation : body->operations) {
        appendTimeline(
            buffers, {static_cast<jint>(operation.kind), operation.start}, operation.segments, [](const double value) {
              return value;
            });
      }
    } else {
      const auto &timeline = std::get<ValueTimeline>(track.body);
      const auto start = std::visit(StartEncoder{}, timeline.start);
      appendTrackHeader(buffers, track, start.form, 1);
      appendTimeline(buffers, {kNoOperation, start.value}, timeline.segments, encodedValueOf);
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

/// Sets the time of a platform pass for its operations, and clears it at the end of the pass. A pass of a
/// dispatch also clears the number of the dispatch.
class PassScope {
 public:
  PassScope(
      std::optional<double> &passTimestampMs,
      const double nowMs,
      std::optional<std::uint64_t> *dispatch = nullptr)
      : passTimestampMs_(passTimestampMs), dispatch_(dispatch) {
    passTimestampMs_ = nowMs;
  }
  ~PassScope() {
    passTimestampMs_.reset();
    if (dispatch_ != nullptr) {
      dispatch_->reset();
    }
  }
  PassScope(const PassScope &) = delete;
  PassScope &operator=(const PassScope &) = delete;

 private:
  std::optional<double> &passTimestampMs_;
  std::optional<std::uint64_t> *const dispatch_;
};

std::vector<double> toDoubles(local_ref<JArrayDouble> array) {
  const auto size = array->size();
  std::vector<double> values(size);
  array->getRegion(0, static_cast<jsize>(size), values.data());
  return values;
}

facebook::react::Transform transformOfCells(const std::vector<double> &cells) {
  facebook::react::Transform transform;
  std::ranges::transform(
      cells, transform.matrix.begin(), [](const double cell) { return static_cast<facebook::react::Float>(cell); });
  return transform;
}

/// The rules of the final view for a geometry track that moves: React Native writes a skew into the animation
/// matrix, the writer inverts the model matrix, and a size-dependent matrix follows the size at the mount.
bool admitsMovingGeometry(const AnimationTrack &track, const facebook::react::ShadowView &finalView) {
  using namespace facebook::react;
  if (!finalView.traits.check(ShadowNodeTraits::Trait::ViewKind)) {
    react_native_assert(track.target != AnimationTarget::Transform && "[Reanimated] A Transform track needs ViewProps");
    return true;
  }
  const auto &viewProps = static_cast<const ViewProps &>(*finalView.props);
  const bool hasSkew = std::ranges::any_of(viewProps.transform.operations, [](const TransformOperation &operation) {
    return operation.type == TransformOperationType::Skew;
  });
  if (hasSkew) {
    return false;
  }
  if (track.target != AnimationTarget::Transform) {
    return true;
  }
  const auto &model = viewProps.resolveTransform(finalView.layoutMetrics).matrix;
  const auto determinant = model[0] * model[5] - model[1] * model[4];
  return std::abs(determinant) > MATRIX_CELL_TOLERANCE && !hasSizeDependentTransform(viewProps);
}

class AndroidMountedAnimation final : public MountedAnimation {
 public:
  AndroidMountedAnimation(
      alias_ref<JNativeAnimationExecutor::javaobject> executor,
      global_ref<JView::javaobject> view,
      const AnimationRequest &request,
      const double passTimestampMs)
      : executor_(executor), view_(std::move(view)), request_(request), passTimestampMs_(passTimestampMs) {}

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
        passTimestampMs_,
        request_.originTimestampMs,
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
  const double passTimestampMs_;
  global_ref<JPreparedPlayback::javaobject> playback_;
};

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
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
  auto javaMembers = sample.members();
  std::vector<PlaybackMember> members;
  members.reserve(javaMembers->size());
  for (size_t index = 0; index < javaMembers->size(); ++index) {
    const auto javaMember = javaMembers->getElement(index);
    const auto componentCount = static_cast<size_t>(javaMember->componentCount());
    const auto components = toDoubles(javaMember->doublesOf("values"));
    PlaybackMember member{javaMember->property()->toStdString(), {}, toDoubles(javaMember->doublesOf("keyTimes"))};
    for (size_t component = 0; component + componentCount <= components.size(); component += componentCount) {
      member.values.emplace_back(components.begin() + component, components.begin() + component + componentCount);
    }
    members.push_back(std::move(member));
  }
  return members;
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

void AndroidNativeAnimationPlatform::willMountItems() {
  currentDispatch_ = ++dispatchCounter_;
}

void AndroidNativeAnimationPlatform::didMountItems(const std::function<void(std::uint64_t dispatch)> &report) {
  react_native_assert(currentDispatch_ && "[Reanimated] didMountItems came with no willMountItems");
  const PassScope pass(passTimestampMs_, getAnimationTimestamp_(), &currentDispatch_);
  report(*currentDispatch_);
}

void AndroidNativeAnimationPlatform::setTrackEndListener(TrackEndListener listener) {
  trackEndListener_ = std::move(listener);
}

bool AndroidNativeAnimationPlatform::canRealize(const AnimationTrack &track, const facebook::react::ShadowView &view) {
  return plays(track) &&
      (!isGeometryTarget(track.target) || !movesGeometry(track) || admitsMovingGeometry(track, view));
}

bool AndroidNativeAnimationPlatform::isSurfaceRunning(const SurfaceId surfaceId) {
  const auto uiManager = uiManager_.lock();
  return uiManager && uiManager->getShadowTreeRegistry().visit(surfaceId, [](const facebook::react::ShadowTree &) {});
}

bool AndroidNativeAnimationPlatform::isInWindow(const SurfaceId surfaceId, const Tag tag) {
  return executor_->isInWindow(surfaceId, tag);
}

std::optional<std::uint64_t> AndroidNativeAnimationPlatform::mountReportOfPull(const SurfaceId /*surfaceId*/) {
  return currentDispatch_;
}

MountedAnimationResolution AndroidNativeAnimationPlatform::resolve(const AnimationRequest &request) {
  ReanimatedSystraceSection section("AndroidNativeAnimationPlatform::resolve");
  react_native_assert(passTimestampMs_ && "[Reanimated] A start resolves outside a platform pass");
  if (!std::ranges::all_of(request.tracks, [this](const AnimationTrack &track) { return plays(track); })) {
    return AnimationResultReason::UnsupportedRealization;
  }
#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
  if (failingViewLookup_ == request.handle.tag) {
    failingViewLookup_.reset();
    const auto onView = executor_->sample(request.handle.tag, static_cast<jint>(request.tracks.front().target));
    viewLookupFailure_ = onView ? toTrackKeys(onView->playbacks()) : std::vector<TrackKey>{};
    return AnimationResultReason::TargetUnavailable;
  }
#endif
  auto view = executor_->findView(request.handle.surfaceId, request.handle.tag);
  // A view that is not mounted yet gets this result too, and CSS continues the run on the loop.
  if (!view) {
    return AnimationResultReason::TargetUnavailable;
  }
  const auto endsAtModel = [this, &view](const AnimationTrack &track) {
    return track.endpointPolicy != EndpointPolicy::MountedModelMustMatchEndpoint || modelEndsAt(view, track);
  };
  if (!std::ranges::all_of(request.tracks, endsAtModel)) {
    return AnimationResultReason::EndpointMismatch;
  }
  return std::make_unique<AndroidMountedAnimation>(executor_, make_global(view), request, *passTimestampMs_);
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
      static_cast<jint>(mode),
      static_cast<jboolean>(currentDispatch_.has_value()));
}

void AndroidNativeAnimationPlatform::modelDidChange(const TrackKey &track, const double value) {
  const auto &handle = track.handle;
  executor_->setModel(
      handle.surfaceId,
      handle.tag,
      static_cast<jint>(handle.owner),
      static_cast<jlong>(handle.generation),
      static_cast<jint>(track.target),
      value);
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

void AndroidNativeAnimationPlatform::failNextViewLookup(const Tag tag) {
  failingViewLookup_ = tag;
}

local_ref<JArrayLong> AndroidNativeAnimationPlatform::takeViewLookupFailure() {
  const auto failure = std::exchange(viewLookupFailure_, std::nullopt);
  return failure ? toJavaTrackKeys(*failure) : nullptr;
}
#endif

bool AndroidNativeAnimationPlatform::plays(const AnimationTrack &track) const {
  const auto playsTiming = [](const AnimationTiming &timing) {
    return std::ranges::find(kAnimatorTimingKinds, kindOf(timing)) != kAnimatorTimingKinds.end();
  };
  const auto playsTimings = [&playsTiming]<typename Value>(const std::vector<TimelineSegment<Value>> &segments) {
    return std::ranges::all_of(segments, [&playsTiming](const TimelineSegment<Value> &segment) {
      return playsTiming(segment.timingFromPrevious);
    });
  };
  if (const auto *body = std::get_if<TransformTimelines>(&track.body)) {
    const auto playsOperation = [&playsTimings](const OperationTimeline &operation) {
      return playsTimings(operation.segments);
    };
    return std::ranges::all_of(body->operations, playsOperation) && playsTarget(track);
  }
  return playsTimings(std::get<ValueTimeline>(track.body).segments) && playsTarget(track);
}

bool AndroidNativeAnimationPlatform::playsTarget(const AnimationTrack &track) const {
  const bool hasAnimationMatrix = apiLevel_ >= __ANDROID_API_Q__;
  switch (track.target) {
    case AnimationTarget::Opacity:
    case AnimationTarget::BackgroundColor:
    case AnimationTarget::BorderColor:
    case AnimationTarget::BorderRadius:
      return true;
    case AnimationTarget::ShadowColor:
      return apiLevel_ >= __ANDROID_API_P__;
    case AnimationTarget::PositionX:
    case AnimationTarget::PositionY:
      return !movesGeometry(track) || hasAnimationMatrix;
    case AnimationTarget::Width:
    case AnimationTarget::Height:
      return !changesValue(track);
    case AnimationTarget::Transform: {
      const auto &operations = std::get<TransformTimelines>(track.body).operations;
      const bool isPlanarBody =
          std::ranges::all_of(operations, [](const OperationTimeline &operation) { return isPlanar(operation.kind); });
      return !movesGeometry(track) || (hasAnimationMatrix && isPlanarBody);
    }
    default:
      return false;
  }
}

bool AndroidNativeAnimationPlatform::modelEndsAt(alias_ref<JView> view, const AnimationTrack &track) const {
  const auto model = toDoubles(executor_->modelOf(view, static_cast<jint>(track.target)));
  if (const auto *body = std::get_if<TransformTimelines>(&track.body)) {
    return model.size() == facebook::react::Transform{}.matrix.size() &&
        isSameAffine2DMatrix(transformOfCells(model), matrixOf(endpointsOf(*body).end));
  }
  const auto &end = std::get<ValueTimeline>(track.body).segments.back().endValue;
  return model.size() == 1 && isSameValue(end, AnimationValue{model.front()});
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
