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

inline const char *&performanceTracerThreadLabelSlot() {
  thread_local const char *label = nullptr;
  return label;
}

} // namespace detail

inline constexpr char kReanimatedPerformanceTracerTrackGroup[] = "Reanimated";

inline std::string reanimatedPerformanceTracerCurrentThreadLabel() {
  const char *label = detail::performanceTracerThreadLabelSlot();
  return std::string(label != nullptr ? label : "Unknown thread");
}

inline void reanimatedPerformanceTracerMarkCurrentThreadAsJs() {
  static std::once_flag once;
  std::call_once(once, [] { detail::performanceTracerThreadLabelSlot() = "JS thread"; });
}

inline void reanimatedPerformanceTracerMarkCurrentThreadAsUi() {
  static std::once_flag once;
  std::call_once(once, [] { detail::performanceTracerThreadLabelSlot() = "UI thread"; });
}

class ReanimatedPerformanceTracerSection {
 public:
  explicit ReanimatedPerformanceTracerSection(const char *name)
      : name_(name),
        active_(facebook::react::jsinspector_modern::tracing::PerformanceTracer::getInstance().isTracing()) {
    if (active_) {
      start_ = facebook::react::HighResTimeStamp::now();
    }
  }

  ReanimatedPerformanceTracerSection(const char *name, std::function<void(folly::dynamic &)> propsFunc)
      : name_(name),
        active_(facebook::react::jsinspector_modern::tracing::PerformanceTracer::getInstance().isTracing()) {
    if (active_) {
      start_ = facebook::react::HighResTimeStamp::now();
      propsFunc_ = std::move(propsFunc);
    }
  }

  ~ReanimatedPerformanceTracerSection() {
    if (!active_ || !start_) {
      return;
    }
    using facebook::react::HighResTimeStamp;
    using facebook::react::jsinspector_modern::tracing::PerformanceTracer;

    const HighResTimeStamp end = HighResTimeStamp::now();
    folly::dynamic devtools = folly::dynamic::object("track", reanimatedPerformanceTracerCurrentThreadLabel())(
        "trackGroup", std::string(kReanimatedPerformanceTracerTrackGroup));
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

  ReanimatedPerformanceTracerSection(const ReanimatedPerformanceTracerSection &) = delete;
  ReanimatedPerformanceTracerSection &operator=(const ReanimatedPerformanceTracerSection &) = delete;

 private:
  const char *name_;
  std::optional<std::function<void(folly::dynamic &)>> propsFunc_;
  bool active_{false};
  std::optional<facebook::react::HighResTimeStamp> start_;
};

} // namespace reanimated
