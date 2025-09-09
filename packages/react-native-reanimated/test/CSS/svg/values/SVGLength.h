#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <string>

namespace reanimated::css {

struct SVGLength : public CSSSimpleValue<SVGLength> {
  double value;
  bool isPercentage;

  SVGLength();
  explicit SVGLength(double value);
  explicit SVGLength(double value, bool isPercentage);
  explicit SVGLength(const char *value);
  explicit SVGLength(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit SVGLength(const folly::dynamic &value);

  static bool canConstruct(const std::string &value);
  static bool canConstruct(const char *value);
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  SVGLength interpolate(double progress, const SVGLength &to) const override;

  bool operator==(const SVGLength &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const SVGLength &dimension);
#endif // NDEBUG
};

} // namespace reanimated::css
