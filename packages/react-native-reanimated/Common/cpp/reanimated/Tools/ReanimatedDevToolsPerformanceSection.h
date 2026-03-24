#pragma once

#include <folly/dynamic.h>
#include <jsinspector-modern/tracing/PerformanceTracer.h>

#include <functional>
#include <optional>
#include <sstream>
#include <string>
#include <thread>
#include <utility>

namespace reanimated {

inline constexpr char kReanimatedDevToolsPerfTraceTrackGroup[] = "Reanimated";

inline std::string reanimatedDevToolsPerfTraceCurrentTrackName() {
  std::ostringstream oss;
  oss << "Thread " << std::this_thread::get_id();
  return oss.str();
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
    folly::dynamic devtools = folly::dynamic::object("track", reanimatedDevToolsPerfTraceCurrentTrackName())(
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
