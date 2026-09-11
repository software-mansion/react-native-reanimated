#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/values/CSSColor.h>

#include <folly/json.h>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

// A single <length-percentage> value used in gradients (color stop positions,
// radial gradient sizes and positions). Pixel values are serialized as
// numbers, percentage values as strings (e.g. "50%") - the same format that
// React Native's backgroundImage prop parsing expects.
struct GradientLengthPercentage {
  double value{0};
  bool isPercent{false};

  static std::optional<GradientLengthPercentage> tryFromDynamic(const folly::dynamic &dynValue);

  folly::dynamic toDynamic() const;
  std::string toString() const;
  GradientLengthPercentage interpolate(double progress, const GradientLengthPercentage &to) const;
  bool canInterpolateTo(const GradientLengthPercentage &to) const;

  bool operator==(const GradientLengthPercentage &other) const = default;
};

// A single gradient color stop. The color is std::nullopt for transition
// hints (e.g. the "20%" in "red, 20%, blue"), the position is std::nullopt
// when it's not specified (React Native distributes such stops evenly).
struct GradientColorStop {
  std::optional<CSSColor> color;
  std::optional<GradientLengthPercentage> position;

  static GradientColorStop fromDynamic(const folly::dynamic &dynValue);

  folly::dynamic toDynamic() const;
  std::string toString() const;
  GradientColorStop interpolate(double progress, const GradientColorStop &to) const;
  bool canInterpolateTo(const GradientColorStop &to) const;

  bool operator==(const GradientColorStop &other) const;
};

bool areColorStopsCompatible(const std::vector<GradientColorStop> &from, const std::vector<GradientColorStop> &to);

std::vector<GradientColorStop> interpolateColorStops(
    double progress,
    const std::vector<GradientColorStop> &from,
    const std::vector<GradientColorStop> &to);

struct CSSLinearGradient : public CSSSimpleValue<CSSLinearGradient> {
  // Direction is either an angle in degrees or a corner keyword
  // (e.g. "to top right")
  bool isKeywordDirection{false};
  double angle{180};
  std::string keyword;
  std::vector<GradientColorStop> colorStops;

  CSSLinearGradient() = default;
  explicit CSSLinearGradient(double angle, std::vector<GradientColorStop> colorStops);
  explicit CSSLinearGradient(std::string keyword, std::vector<GradientColorStop> colorStops);
  explicit CSSLinearGradient(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSLinearGradient(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSLinearGradient interpolate(double progress, const CSSLinearGradient &to) const override;
  bool canInterpolateTo(const CSSLinearGradient &to) const override;

  bool operator==(const CSSLinearGradient &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSLinearGradient &gradientValue);
#endif // NDEBUG
};

struct CSSRadialGradient : public CSSSimpleValue<CSSRadialGradient> {
  std::string shape{"ellipse"};
  // Size is either an extent keyword (e.g. "farthest-corner") or a pair of
  // lengths
  std::optional<std::string> sizeKeyword{"farthest-corner"};
  std::optional<GradientLengthPercentage> sizeX;
  std::optional<GradientLengthPercentage> sizeY;
  // Position is a list of (side, offset) pairs (e.g. {("top", 50%), ("left",
  // 50%)})
  std::vector<std::pair<std::string, GradientLengthPercentage>> position;
  std::vector<GradientColorStop> colorStops;

  CSSRadialGradient();
  explicit CSSRadialGradient(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSRadialGradient(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSRadialGradient interpolate(double progress, const CSSRadialGradient &to) const override;
  bool canInterpolateTo(const CSSRadialGradient &to) const override;

  bool operator==(const CSSRadialGradient &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSRadialGradient &gradientValue);
#endif // NDEBUG
};

} // namespace reanimated::css
