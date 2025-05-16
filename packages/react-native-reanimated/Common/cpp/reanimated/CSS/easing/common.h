#pragma once

namespace reanimated::css {

enum class EasingType { Linear, CubicBezier, Steps };

class Easing {
 public:
  virtual ~Easing() = default;

  virtual double calculate(double x) const = 0;

  virtual bool operator==(const Easing &other) const = 0;
  virtual EasingType getType() const = 0;
};

template <EasingType Type>
class EasingBase : public Easing {
 public:
  virtual ~EasingBase() = default;

  EasingType getType() const override {
    return Type;
  }

  bool operator==(const Easing &other) const override {
    if (other.getType() != Type) {
      return false;
    }
    return *this == static_cast<const EasingBase<Type> &>(other);
  }

  virtual bool operator==(const EasingBase<Type> &other) const = 0;
};

} // namespace reanimated::css
