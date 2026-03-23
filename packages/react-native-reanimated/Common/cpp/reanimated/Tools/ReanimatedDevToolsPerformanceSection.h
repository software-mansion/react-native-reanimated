#pragma once

#include <folly/dynamic.h>
#include <jsinspector-modern/tracing/PerformanceTracer.h>

#include <optional>
#include <string>
#include <utility>

namespace reanimated {

class ReanimatedDevToolsPerformanceSection {
 public:
  explicit ReanimatedDevToolsPerformanceSection(const char *name, const char *trackName = "Reanimated")
      : name_(name),
        trackName_(trackName),
        active_(facebook::react::jsinspector_modern::tracing::PerformanceTracer::getInstance().isTracing()) {
    if (active_) {
      start_ = facebook::react::HighResTimeStamp::now();
    }
  }

  ~ReanimatedDevToolsPerformanceSection() {
    if (!active_ || !start_) {
      return;
    }
    using facebook::react::HighResTimeStamp;
    using facebook::react::jsinspector_modern::tracing::PerformanceTracer;

    const HighResTimeStamp end = HighResTimeStamp::now();
    folly::dynamic detail =
        folly::dynamic::object("devtools", folly::dynamic::object("track", std::string(trackName_)));

    PerformanceTracer::getInstance().reportMeasure(
        std::string(name_), *start_, end - *start_, std::move(detail), std::nullopt);
  }

  ReanimatedDevToolsPerformanceSection(const ReanimatedDevToolsPerformanceSection &) = delete;
  ReanimatedDevToolsPerformanceSection &operator=(const ReanimatedDevToolsPerformanceSection &) = delete;

 private:
  const char *name_;
  const char *trackName_;
  bool active_{false};
  std::optional<facebook::react::HighResTimeStamp> start_;
};

} // namespace reanimated
