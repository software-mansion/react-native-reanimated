#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <iomanip>
#include <regex>
#include <sstream>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace worklets;

struct CSSAngle : public CSSSimpleValue<CSSAngle> {
  double value;

  CSSAngle();
  explicit CSSAngle(double value);
  explicit CSSAngle(const std::string &rotationString);
  explicit CSSAngle(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSAngle interpolate(double progress, const CSSAngle &to) const override;

  bool operator==(const CSSAngle &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSAngle &angleValue);
#endif // NDEBUG
};

} // namespace reanimated::css
