#pragma once

#include <react/renderer/core/ReactPrimitives.h>

#include <array>
#include <cstddef>
#include <cstdint>
#include <unordered_map>

namespace reanimated {

using namespace facebook::react;

/// The layout requests of each view over the last second. A view with `RequestsPerSecond` or more requests in
/// that second plays its layout changes frame-driven: the native route then costs more energy than the frame
/// driver.
class LayoutRequestRates {
 public:
  static constexpr size_t RequestsPerSecond = 20;

  enum class Route : uint8_t {
    Native,
    /// The first request over the rate after a request under it.
    FrameDrivenFromNow,
    FrameDriven,
  };

  Route record(Tag tag, double timeMs);
  void forget(Tag tag);
  void clear();

 private:
  struct Requests {
    std::array<double, RequestsPerSecond> timesMs{};
    size_t next{0};
    size_t count{0};
    bool isOverRate{false};
  };

  std::unordered_map<Tag, Requests> requests_;
};

} // namespace reanimated
