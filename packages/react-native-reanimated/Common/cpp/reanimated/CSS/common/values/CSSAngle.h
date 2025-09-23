#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <folly/json.h>
#include <string>

namespace reanimated::css {

using namespace worklets;

struct CSSAngle : public CSSSimpleValue<CSSAngle> {
  double value;

  CSSAngle();
  explicit CSSAngle(double value);
  explicit CSSAngle(const std::string &rotationString);
  explicit CSSAngle(const char *cstr);
  explicit CSSAngle(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSAngle(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSAngle interpolate(double progress, const CSSAngle &to) const override;

  bool operator==(const CSSAngle &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSAngle &angleValue);
#endif // NDEBUG
};

} // namespace reanimated::css
