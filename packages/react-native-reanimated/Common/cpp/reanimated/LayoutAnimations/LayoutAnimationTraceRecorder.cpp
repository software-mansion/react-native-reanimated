// LayoutAnimationTrace start
#include <reanimated/LayoutAnimations/LayoutAnimationTraceRecorder.h>

#ifndef NDEBUG

#include <folly/json.h>

#include <exception>
#include <sstream>
#include <utility>
#include <vector>

namespace reanimated::layout_animation_trace {

namespace {

const char *toString(const Backend backend) {
  switch (backend) {
    case Backend::Legacy:
      return "legacy";
    case Backend::Native:
      return "native";
  }
  return "unknown";
}

const char *toString(const Source source) {
  switch (source) {
    case Source::RNJS:
      return "rn-js";
    case Source::UIRuntime:
      return "ui-runtime";
    case Source::Fabric:
      return "fabric";
    case Source::IOS:
      return "ios";
    case Source::Android:
      return "android";
  }
  return "unknown";
}

const char *toString(const AnimationType type) {
  switch (type) {
    case AnimationType::Entering:
      return "entering";
    case AnimationType::Exiting:
      return "exiting";
    case AnimationType::Layout:
      return "layout";
  }
  return "unknown";
}

const char *toString(const MutationType type) {
  switch (type) {
    case MutationType::Create:
      return "create";
    case MutationType::Insert:
      return "insert";
    case MutationType::Update:
      return "update";
    case MutationType::Remove:
      return "remove";
    case MutationType::Delete:
      return "delete";
  }
  return "unknown";
}

const char *toString(const EventName event) {
  switch (event) {
    case EventName::SessionStarted:
      return "session-started";
    case EventName::ScenarioReset:
      return "scenario-reset";
    case EventName::ScenarioRun:
      return "scenario-run";
    case EventName::ScenarioInterrupt:
      return "scenario-interrupt";
    case EventName::ScenarioCancel:
      return "scenario-cancel";
    case EventName::ConfigurationQueued:
      return "configuration-queued";
    case EventName::ConfigurationFlushed:
      return "configuration-flushed";
    case EventName::ConfigurationStored:
      return "configuration-stored";
    case EventName::MutationSeen:
      return "mutation-seen";
    case EventName::MutationEmitted:
      return "mutation-emitted";
    case EventName::RemovalDelayed:
      return "removal-delayed";
    case EventName::StartRequested:
      return "start-requested";
    case EventName::UIRuntimeStarted:
      return "ui-runtime-started";
    case EventName::DescriptorCreated:
      return "descriptor-created";
    case EventName::PlatformStartScheduled:
      return "platform-start-scheduled";
    case EventName::PostMountObserved:
      return "post-mount-observed";
    case EventName::PlatformStarted:
      return "platform-started";
    case EventName::NativeViewLookup:
      return "native-view-lookup";
    case EventName::Progress:
      return "progress";
    case EventName::ModelPresentationSample:
      return "model-presentation-sample";
    case EventName::SurfaceFlushRequested:
      return "surface-flush-requested";
    case EventName::CancelRequested:
      return "cancel-requested";
    case EventName::PlatformCompleted:
      return "platform-completed";
    case EventName::LogicalCompleted:
      return "logical-completed";
    case EventName::CallbackInvoked:
      return "callback-invoked";
    case EventName::AnimationSettled:
      return "animation-settled";
    case EventName::RemoveEmitted:
      return "remove-emitted";
    case EventName::DeleteEmitted:
      return "delete-emitted";
    case EventName::Assertion:
      return "assertion";
  }
  return "unknown";
}

folly::dynamic pointToDynamic(const Point &point) {
  return folly::dynamic::object("x", point.x)("y", point.y);
}

folly::dynamic frameToDynamic(const Frame &frame) {
  return folly::dynamic::object("x", frame.x)("y", frame.y)("width", frame.width)("height", frame.height);
}

folly::dynamic layerValuesToDynamic(const LayerValues &values) {
  folly::dynamic result = folly::dynamic::object;
  if (values.opacity) {
    result["opacity"] = *values.opacity;
  }
  if (values.position) {
    result["position"] = pointToDynamic(*values.position);
  }
  if (values.bounds) {
    result["bounds"] = frameToDynamic(*values.bounds);
  }
  if (values.transform) {
    folly::dynamic transform = folly::dynamic::array;
    for (const auto value : *values.transform) {
      transform.push_back(value);
    }
    result["transform"] = std::move(transform);
  }
  return result;
}

folly::dynamic valuesToDynamic(const Values &values) {
  folly::dynamic result = folly::dynamic::object;
  if (values.model) {
    result["model"] = layerValuesToDynamic(*values.model);
  }
  if (values.presentation) {
    result["presentation"] = layerValuesToDynamic(*values.presentation);
  }
  if (values.hostFrame) {
    result["hostFrame"] = frameToDynamic(*values.hostFrame);
  }
  if (values.accessibilityFrame) {
    result["accessibilityFrame"] = frameToDynamic(*values.accessibilityFrame);
  }
  if (values.hitTestTag) {
    if (values.hitTestTag->has_value()) {
      result["hitTestTag"] = **values.hitTestTag;
    } else {
      result["hitTestTag"] = nullptr;
    }
  }
  return result;
}

folly::dynamic mutationToDynamic(const Mutation &mutation) {
  folly::dynamic result = folly::dynamic::object("type", toString(mutation.type));
  if (mutation.parentTag) {
    result["parentTag"] = *mutation.parentTag;
  }
  if (mutation.index) {
    result["index"] = *mutation.index;
  }
  if (mutation.oldFrame) {
    result["oldFrame"] = frameToDynamic(*mutation.oldFrame);
  }
  if (mutation.newFrame) {
    result["newFrame"] = frameToDynamic(*mutation.newFrame);
  }
  return result;
}

folly::dynamic environmentToDynamic(const Environment &environment) {
  folly::dynamic result =
      folly::dynamic::object("platform", environment.platform)("reducedMotion", environment.reducedMotion);
  if (environment.commitSha) {
    result["commitSha"] = *environment.commitSha;
  }
  if (environment.osVersion) {
    result["osVersion"] = *environment.osVersion;
  }
  if (environment.deviceModel) {
    result["deviceModel"] = *environment.deviceModel;
  }
  return result;
}

folly::dynamic assertionToDynamic(const Assertion &assertion) {
  folly::dynamic result = folly::dynamic::object("name", assertion.name)("passed", assertion.passed);
  if (assertion.expected) {
    result["expected"] = *assertion.expected;
  }
  if (assertion.actual) {
    result["actual"] = *assertion.actual;
  }
  return result;
}

folly::dynamic eventToDynamic(const Event &event) {
  folly::dynamic result = folly::dynamic::object("schemaVersion", event.schemaVersion)(
      "sequence", static_cast<int64_t>(event.sequence))("runId", static_cast<int64_t>(event.runId))(
      "timestampMs", event.timestampMs)("backend", toString(event.backend))("scenario", event.scenario)(
      "source", toString(event.source))("event", toString(event.event));

  if (event.thread) {
    result["thread"] = *event.thread;
  }
  if (event.role) {
    result["role"] = *event.role;
  }
  if (event.tag) {
    result["tag"] = *event.tag;
  }
  if (event.surfaceId) {
    result["surfaceId"] = *event.surfaceId;
  }
  if (event.animationType) {
    result["animationType"] = toString(*event.animationType);
  }
  if (event.generation) {
    result["generation"] = static_cast<int64_t>(*event.generation);
  }
  if (event.mutation) {
    result["mutation"] = mutationToDynamic(*event.mutation);
  }
  if (event.values) {
    result["values"] = valuesToDynamic(*event.values);
  }
  if (event.finished) {
    result["finished"] = *event.finished;
  }
  if (event.callbackCount) {
    result["callbackCount"] = static_cast<int64_t>(*event.callbackCount);
  }
  if (event.platformAnimationCreated) {
    result["platformAnimationCreated"] = *event.platformAnimationCreated;
  }
  if (event.assertion) {
    result["assertion"] = assertionToDynamic(*event.assertion);
  }
  if (event.environment) {
    result["environment"] = environmentToDynamic(*event.environment);
  }
  if (event.details) {
    result["details"] = *event.details;
  }
  return result;
}

std::string serializeEvent(const Event &event) {
  try {
    return folly::toJson(eventToDynamic(event));
  } catch (const std::exception &error) {
    return folly::toJson(
        folly::dynamic::object("schemaVersion", kSchemaVersion)("sequence", static_cast<int64_t>(event.sequence))(
            "runId", static_cast<int64_t>(event.runId))("timestampMs", 0)("backend", toString(event.backend))(
            "scenario", event.scenario)("source", toString(event.source))("event", "assertion")(
            "assertion",
            folly::dynamic::object("name", "trace-event-serialization")("passed", false)("actual", error.what())));
  }
}

} // namespace

Recorder &Recorder::getInstance() {
  static Recorder recorder;
  return recorder;
}

void Recorder::start(Session session) {
  std::lock_guard lock(mutex_);
  session_ = std::move(session);
  sessionStart_ = Clock::now();
  nextSequence_ = 1;
  droppedEventCount_ = 0;
  events_.clear();
  generations_.clear();
  active_ = true;
}

void Recorder::stop() {
  std::lock_guard lock(mutex_);
  active_ = false;
}

void Recorder::clear() {
  std::lock_guard lock(mutex_);
  sessionStart_ = Clock::now();
  nextSequence_ = 1;
  droppedEventCount_ = 0;
  events_.clear();
  generations_.clear();
}

bool Recorder::isActive() const {
  std::lock_guard lock(mutex_);
  return active_;
}

uint64_t Recorder::beginGeneration(const int tag) {
  std::lock_guard lock(mutex_);
  if (!active_ || !session_) {
    return 0;
  }
  return ++generations_[tag];
}

std::optional<uint64_t> Recorder::getGeneration(const int tag) const {
  std::lock_guard lock(mutex_);
  const auto generation = generations_.find(tag);
  if (generation == generations_.end()) {
    return std::nullopt;
  }
  return generation->second;
}

void Recorder::record(Event event) {
  std::lock_guard lock(mutex_);
  if (!active_ || !session_) {
    return;
  }

  event.schemaVersion = kSchemaVersion;
  event.sequence = nextSequence_++;
  event.runId = session_->runId;
  event.timestampMs = std::chrono::duration<double, std::milli>(Clock::now() - sessionStart_).count();
  event.backend = session_->backend;
  event.scenario = session_->scenario;
  if (!event.generation && event.tag) {
    const auto generation = generations_.find(*event.tag);
    if (generation != generations_.end()) {
      event.generation = generation->second;
    }
  }

  if (events_.size() == kCapacity) {
    events_.pop_front();
    droppedEventCount_++;
  }
  events_.push_back(std::move(event));
}

std::string Recorder::exportJSONL() const {
  std::optional<Session> session;
  std::vector<Event> events;
  uint64_t droppedEventCount;
  {
    std::lock_guard lock(mutex_);
    if (!session_) {
      return {};
    }
    session = session_;
    events.assign(events_.begin(), events_.end());
    droppedEventCount = droppedEventCount_;
  }

  Event header;
  header.sequence = 0;
  header.runId = session->runId;
  header.backend = session->backend;
  header.scenario = session->scenario;
  header.source = Source::RNJS;
  header.event = EventName::SessionStarted;
  header.environment = session->environment;
  header.details = folly::dynamic::object("capacity", static_cast<int64_t>(kCapacity))(
      "droppedEventCount", static_cast<int64_t>(droppedEventCount));

  std::ostringstream output;
  output << serializeEvent(header);
  for (const auto &event : events) {
    output << '\n' << serializeEvent(event);
  }
  return output.str();
}

} // namespace reanimated::layout_animation_trace

#endif // NDEBUG
// LayoutAnimationTrace end
