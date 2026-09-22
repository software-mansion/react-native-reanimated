#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <folly/dynamic.h>
#include <optional>
#include <string>
#include <utility>
#include <variant>
#include <vector>

namespace reanimated::css {

struct CSSGradientLength {
  double value{0};
  bool isPercent{false};

  static std::optional<CSSGradientLength> fromDynamic(const folly::dynamic &value);

  folly::dynamic toDynamic() const;
  std::string toString() const;
  CSSGradientLength interpolate(double progress, const CSSGradientLength &to) const;
  bool canInterpolateTo(const CSSGradientLength &to) const;

  bool operator==(const CSSGradientLength &other) const;
};

struct CSSGradient : public CSSSimpleValue<CSSGradient> {
  enum class Type : std::uint8_t { Linear, Radial };

  struct ColorStop {
    std::optional<CSSColor> color;
    std::optional<CSSGradientLength> position;

    bool operator==(const ColorStop &other) const;
  };

  using Direction = std::variant<double, std::string>;
  using RadialSize = std::variant<std::string, std::pair<CSSGradientLength, CSSGradientLength>>;

  struct RadialPosition {
    std::optional<CSSGradientLength> top;
    std::optional<CSSGradientLength> left;
    std::optional<CSSGradientLength> right;
    std::optional<CSSGradientLength> bottom;

    bool operator==(const RadialPosition &other) const;
  };

  Type type{Type::Linear};
  Direction direction{180.0};
  std::string shape{"ellipse"};
  RadialSize size{std::string("farthest-corner")};
  RadialPosition position;
  std::vector<ColorStop> colorStops;

  CSSGradient() = default;
  explicit CSSGradient(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSGradient(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSGradient interpolate(double progress, const CSSGradient &to) const override;
  bool canInterpolateTo(const CSSGradient &to) const override;

  bool operator==(const CSSGradient &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSGradient &gradient);
#endif // NDEBUG

 private:
  bool isNone() const;
  CSSGradient withTransparentColors() const;
  std::vector<ColorStop> paddedColorStops(size_t count) const;
  static std::vector<std::optional<CSSGradientLength>> resolvedStopPositions(const std::vector<ColorStop> &stops);
};

} // namespace reanimated::css
