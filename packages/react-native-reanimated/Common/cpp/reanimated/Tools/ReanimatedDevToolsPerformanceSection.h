#pragma once

#include <folly/dynamic.h>
#include <jsinspector-modern/tracing/PerformanceTracer.h>

#include <functional>
#include <mutex>
#include <optional>
#include <string>
#include <utility>

namespace reanimated {

namespace detail {

inline const char *&devToolsPerfTraceThreadLabelSlot() {
  thread_local const char *label = nullptr;
  return label;
}

} // namespace detail

inline constexpr char kReanimatedDevToolsPerfTraceTrackGroup[] = "Reanimated";

inline std::string reanimatedDevToolsPerfTraceCurrentThreadLabel() {
  const char *label = detail::devToolsPerfTraceThreadLabelSlot();
  return std::string(label != nullptr ? label : "Unknown thread");
}

inline void reanimatedDevToolsPerfTraceMarkCurrentThreadAsJs() {
  static std::once_flag once;
  std::call_once(once, [] {
    detail::devToolsPerfTraceThreadLabelSlot() = "JS thread";
  });
}

inline void reanimatedDevToolsPerfTraceMarkCurrentThreadAsUi() {
  static std::once_flag once;
  std::call_once(once, [] {
    detail::devToolsPerfTraceThreadLabelSlot() = "UI thread";
  });
}

class ReanimatedDevToolsPerformanceSection {
 public:
  explicit ReanimatedDevToolsPerformanceSection(const char *name)
      : name_(name),
        active_(facebook::react::jsinspector_modern::tracing::PerformanceTracer::getInstance().isTracing()) {
    if (active_) {
      start_ = facebook::react::HighResTimeStamp::now();
    }
  }

  ReanimatedDevToolsPerformanceSection(const char *name, std::function<void(folly::dynamic &)> propsFunc)
      : name_(name),
        active_(facebook::react::jsinspector_modern::tracing::PerformanceTracer::getInstance().isTracing()) {
    if (active_) {
      start_ = facebook::react::HighResTimeStamp::now();
      propsFunc_ = std::move(propsFunc);
    }
  }

  ~ReanimatedDevToolsPerformanceSection() {
    if (!active_ || !start_) {
      return;
    }
    using facebook::react::HighResTimeStamp;
    using facebook::react::jsinspector_modern::tracing::PerformanceTracer;

    const HighResTimeStamp end = HighResTimeStamp::now();
    folly::dynamic devtools = folly::dynamic::object("track", reanimatedDevToolsPerfTraceCurrentThreadLabel())(
        "trackGroup", std::string(kReanimatedDevToolsPerfTraceTrackGroup));
    if (propsFunc_.has_value()) {
      folly::dynamic props = folly::dynamic::array();
      (*propsFunc_)(props);
      if (props.isArray()) {
        devtools["properties"] = std::move(props);
      }
    }
    folly::dynamic detail = folly::dynamic::object("devtools", std::move(devtools));

    PerformanceTracer::getInstance().reportMeasure(
        std::string(name_), *start_, end - *start_, std::move(detail), std::nullopt);
  }

  ReanimatedDevToolsPerformanceSection(const ReanimatedDevToolsPerformanceSection &) = delete;
  ReanimatedDevToolsPerformanceSection &operator=(const ReanimatedDevToolsPerformanceSection &) = delete;

 private:
  const char *name_;
  std::optional<std::function<void(folly::dynamic &)>> propsFunc_;
  bool active_{false};
  std::optional<facebook::react::HighResTimeStamp> start_;
};

} // namespace reanimated
