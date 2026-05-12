#pragma once

#include <cxxreact/ReactNativeVersion.h>
#include <folly/dynamic.h>
#include <jsinspector-modern/tracing/PerformanceTracer.h>

#include <functional>
#include <optional>
#include <string>
#include <utility>

#if REACT_NATIVE_VERSION_MINOR < 82
#include <jsinspector-modern/tracing/CdpTracing.h>
#endif

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
  auto &slot = detail::performanceTracerThreadLabelSlot();
  if (slot == nullptr) {
    slot = "JS thread";
  }
}

inline void reanimatedPerformanceTracerMarkCurrentThreadAsUi() {
  auto &slot = detail::performanceTracerThreadLabelSlot();
  if (slot == nullptr) {
    slot = "UI thread";
  }
}

// NOTE: The destructor of this class is non-trivial (it allocates `folly::dynamic`
// objects and calls into `PerformanceTracer`). Do not use it for hot paths or
// frequently invoked operations — limit usage to coarse-grained sections.
class ReanimatedPerformanceTracerSection {
 public:
  explicit ReanimatedPerformanceTracerSection(const char *name) : name_(name) {
    if (facebook::react::jsinspector_modern::tracing::PerformanceTracer::getInstance().isTracing()) {
      start_ = facebook::react::HighResTimeStamp::now();
    }
  }

  ReanimatedPerformanceTracerSection(const char *name, std::function<void(folly::dynamic &)> propsFunc) : name_(name) {
    if (facebook::react::jsinspector_modern::tracing::PerformanceTracer::getInstance().isTracing()) {
      start_ = facebook::react::HighResTimeStamp::now();
      propsFunc_ = std::move(propsFunc);
    }
  }

  ~ReanimatedPerformanceTracerSection() {
    if (!start_) {
      return;
    }
    using facebook::react::HighResTimeStamp;
    using facebook::react::jsinspector_modern::tracing::PerformanceTracer;

    const HighResTimeStamp end = HighResTimeStamp::now();
#if REACT_NATIVE_VERSION_MINOR >= 82
    // 0.82+ accepts a `folly::dynamic` detail. The 5th `stackTrace` parameter
    // added in 0.84 is defaulted, so a 4-arg call works for 0.82-0.86.
    folly::dynamic devtools = folly::dynamic::object("track", reanimatedPerformanceTracerCurrentThreadLabel())(
        "trackGroup", std::string(kReanimatedPerformanceTracerTrackGroup));
    if (propsFunc_) {
      folly::dynamic props = folly::dynamic::array();
      propsFunc_(props);
      if (props.isArray()) {
        devtools["properties"] = std::move(props);
      }
    }
    folly::dynamic detail = folly::dynamic::object("devtools", std::move(devtools));

    PerformanceTracer::getInstance().reportMeasure(std::string(name_), *start_, end - *start_, std::move(detail));
#else
    // 0.81 only supports a single track name (no track group, no properties).
    PerformanceTracer::getInstance().reportMeasure(
        std::string(name_),
        *start_,
        end - *start_,
        facebook::react::jsinspector_modern::DevToolsTrackEntryPayload{
            std::string(kReanimatedPerformanceTracerTrackGroup) + " · " +
            reanimatedPerformanceTracerCurrentThreadLabel()});
#endif
  }

  ReanimatedPerformanceTracerSection(const ReanimatedPerformanceTracerSection &) = delete;
  ReanimatedPerformanceTracerSection &operator=(const ReanimatedPerformanceTracerSection &) = delete;

 private:
  const char *name_;
  std::function<void(folly::dynamic &)> propsFunc_;
  std::optional<facebook::react::HighResTimeStamp> start_;
};

} // namespace reanimated
