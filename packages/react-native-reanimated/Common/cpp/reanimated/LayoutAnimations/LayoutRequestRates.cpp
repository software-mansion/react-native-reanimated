#include <reanimated/LayoutAnimations/LayoutRequestRates.h>

#include <algorithm>

namespace reanimated {

namespace {

constexpr double RATE_WINDOW_MS = 1000;

} // namespace

LayoutRequestRates::Route LayoutRequestRates::record(const Tag tag, const double timeMs) {
  auto &requests = requests_[tag];
  requests.timesMs[requests.next] = timeMs;
  requests.next = (requests.next + 1) % RequestsPerSecond;
  requests.count = std::min(requests.count + 1, RequestsPerSecond);
  const double oldestMs = requests.timesMs[requests.next];
  const bool wasOverRate = requests.isOverRate;
  requests.isOverRate = requests.count == RequestsPerSecond && oldestMs > timeMs - RATE_WINDOW_MS;
  if (!requests.isOverRate) {
    return Route::Native;
  }
  return wasOverRate ? Route::FrameDriven : Route::FrameDrivenFromNow;
}

void LayoutRequestRates::forget(const Tag tag) {
  requests_.erase(tag);
}

void LayoutRequestRates::clear() {
  requests_.clear();
}

} // namespace reanimated
