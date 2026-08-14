#pragma once

#include <cstdint>
#include <functional>
#include <unordered_map>
#include <vector>

namespace reanimated {

/// Carries the curve's own points rather than a sampled table, so a discontinuous
/// steps() survives at any duration.
struct PlatformEasing {
  enum class Type : std::uint8_t { Linear = 0, CubicBezier = 1, Steps = 2, LinearStops = 3 };

  Type type;
  std::vector<float> pointsX;
  std::vector<float> pointsY;

  bool operator==(const PlatformEasing &other) const = default;
};

struct PlatformEasingHash {
  std::size_t operator()(const PlatformEasing &easing) const;
};

/// Registers each distinct curve with the platform once and hands back an id, so a start crosses
/// JNI carrying an int rather than two float arrays. Knows nothing about what is animating, so
/// every platform-driven animation kind can share one instance.
class CSSPlatformEasings {
 public:
  using DefineFunction =
      std::function<void(int easingId, int type, const std::vector<float> &pointsX, const std::vector<float> &pointsY)>;

  /// Ids are never reused, so a curve nobody needs has to be removed explicitly.
  using UndefineFunction = std::function<void(int easingId)>;

  CSSPlatformEasings(DefineFunction define, UndefineFunction undefine);

  /// Interns on first sight and takes a reference; pair every call with release(). Always
  /// succeeds, so a caller never has to handle a curve it could not register.
  int acquire(const PlatformEasing &easing);

  /// Hands a reference back, dropping the curve from both sides once none remain.
  void release(int easingId);

 private:
  struct Interned {
    PlatformEasing easing;
    int refCount;
  };

  std::unordered_map<PlatformEasing, int, PlatformEasingHash> ids_;
  std::unordered_map<int, Interned> interned_;
  int nextId_{0};
  DefineFunction define_;
  UndefineFunction undefine_;
};

} // namespace reanimated
