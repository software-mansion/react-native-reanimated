#pragma once

// LayoutAnimationTrace start

#include <array>
#include <cstdint>
#include <optional>
#include <string>

#include <folly/dynamic.h>

namespace reanimated::layout_animation_trace {

inline constexpr int kSchemaVersion = 1;

enum class Backend { Legacy, Native };
enum class Source { RNJS, UIRuntime, Fabric, IOS, Android };
enum class AnimationType { Entering, Exiting, Layout };
enum class MutationType { Create, Insert, Update, Remove, Delete };
enum class EventName {
  SessionStarted,
  ScenarioReset,
  ScenarioRun,
  ScenarioInterrupt,
  ScenarioCancel,
  ConfigurationQueued,
  ConfigurationFlushed,
  ConfigurationStored,
  MutationSeen,
  MutationEmitted,
  RemovalDelayed,
  StartRequested,
  UIRuntimeStarted,
  DescriptorCreated,
  PlatformStartScheduled,
  PostMountObserved,
  PlatformStarted,
  NativeViewLookup,
  Progress,
  ModelPresentationSample,
  SurfaceFlushRequested,
  CancelRequested,
  PlatformCompleted,
  LogicalCompleted,
  CallbackInvoked,
  AnimationSettled,
  RemoveEmitted,
  DeleteEmitted,
  Assertion,
};

struct Point {
  double x;
  double y;
};

struct Frame {
  double x;
  double y;
  double width;
  double height;
};

struct LayerValues {
  std::optional<double> opacity;
  std::optional<Point> position;
  std::optional<Frame> bounds;
  std::optional<std::array<double, 16>> transform;
};

struct Values {
  std::optional<LayerValues> model;
  std::optional<LayerValues> presentation;
  std::optional<Frame> hostFrame;
  std::optional<Frame> accessibilityFrame;
  // Outer optional means "not sampled"; inner nullopt means "sampled miss".
  std::optional<std::optional<int>> hitTestTag;
};

struct Mutation {
  MutationType type;
  std::optional<int> parentTag;
  std::optional<int> index;
  std::optional<Frame> oldFrame;
  std::optional<Frame> newFrame;
};

struct Assertion {
  std::string name;
  bool passed;
  std::optional<folly::dynamic> expected;
  std::optional<folly::dynamic> actual;
};

struct Environment {
  std::optional<std::string> commitSha;
  std::string platform;
  std::optional<std::string> osVersion;
  std::optional<std::string> deviceModel;
  bool reducedMotion;
};

struct Event {
  int schemaVersion{kSchemaVersion};
  uint64_t sequence{0};
  uint64_t runId{0};
  double timestampMs{0};
  Backend backend{Backend::Legacy};
  std::string scenario;
  Source source{Source::RNJS};
  EventName event{EventName::SessionStarted};

  std::optional<std::string> thread;
  std::optional<std::string> role;
  std::optional<int> tag;
  std::optional<int> surfaceId;
  std::optional<AnimationType> animationType;
  std::optional<uint64_t> generation;
  std::optional<Mutation> mutation;
  std::optional<Values> values;
  std::optional<bool> finished;
  std::optional<uint64_t> callbackCount;
  std::optional<bool> platformAnimationCreated;
  std::optional<Assertion> assertion;
  std::optional<Environment> environment;
  std::optional<folly::dynamic> details;
};

} // namespace reanimated::layout_animation_trace
// LayoutAnimationTrace end
