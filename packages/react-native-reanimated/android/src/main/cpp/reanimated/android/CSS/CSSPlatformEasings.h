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

/// Registers each distinct curve with the platform once and hands back an id, so a start
/// crosses the JNI boundary carrying an int rather than two float arrays. Knows nothing about
/// what is animating: any platform-driven animation kind can share one instance.
class CSSPlatformEasings {
 public:
  /// Registers a curve under an id.
  using DefineFunction =
      std::function<void(int easingId, int type, const std::vector<float> &pointsX, const std::vector<float> &pointsY)>;

  /// Drops a curve the platform no longer needs. Ids are never reused, so nothing overwrites it.
  using UndefineFunction = std::function<void(int easingId)>;

  CSSPlatformEasings(DefineFunction define, UndefineFunction undefine);

  /// Interns the curve if it is new and takes a reference. Pair every call with release():
  /// interning and retaining together means a caller cannot register a curve and then forget
  /// to own it. Always succeeds; ids just keep counting up.
  int acquire(const PlatformEasing &easing);

  /// Hands a reference back, dropping the curve from both sides once none remain.
  void release(int easingId);

 private:
  /// The curve behind an id, and how many holders still need it.
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
