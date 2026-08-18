#include <reanimated/android/CSS/CSSPlatformEasings.h>

#include <utility>

namespace reanimated {

CSSPlatformEasings::CSSPlatformEasings(DefineFunction define, UndefineFunction undefine)
    : define_(std::move(define)), undefine_(std::move(undefine)) {}

std::size_t PlatformEasingHash::operator()(const PlatformEasing &easing) const {
  std::size_t seed = std::hash<std::uint8_t>{}(static_cast<std::uint8_t>(easing.type));
  const auto combine = [&seed](const float value) {
    seed ^= std::hash<float>{}(value) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
  };
  for (const float value : easing.pointsX) {
    combine(value);
  }
  for (const float value : easing.pointsY) {
    combine(value);
  }
  return seed;
}

int CSSPlatformEasings::acquire(const PlatformEasing &easing) {
  const auto it = ids_.find(easing);
  if (it != ids_.end()) {
    ++interned_.at(it->second).refCount;
    return it->second;
  }

  const int easingId = nextId_++;
  define_(easingId, static_cast<int>(easing.type), easing.pointsX, easing.pointsY);
  ids_.emplace(easing, easingId);
  interned_.emplace(easingId, Interned{easing, 1});
  return easingId;
}

void CSSPlatformEasings::release(const int easingId) {
  const auto it = interned_.find(easingId);
  if (--it->second.refCount > 0) {
    return;
  }
  ids_.erase(it->second.easing);
  interned_.erase(it);
  undefine_(easingId);
  if (interned_.empty()) {
    // Small ids stay inside the platform side's key cache, so restart while none are in use.
    nextId_ = 0;
  }
}

} // namespace reanimated
