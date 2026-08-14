#pragma once

#include <cstdint>
#include <functional>
#include <unordered_map>
#include <vector>

namespace reanimated {

/// Raw points rather than a sampled table, so steps() keeps its discontinuities.
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

/// Registers each distinct curve once so a start carries an id instead of its points.
class CSSPlatformEasings {
 public:
  using DefineFunction =
      std::function<void(int easingId, int type, const std::vector<float> &pointsX, const std::vector<float> &pointsY)>;

  /// A live id is never handed to another curve, so nothing overwrites the platform's entry.
  using UndefineFunction = std::function<void(int easingId)>;

  CSSPlatformEasings(DefineFunction define, UndefineFunction undefine);

  /// Interns on first sight and takes a reference; pair every call with release().
  int acquire(const PlatformEasing &easing);

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
