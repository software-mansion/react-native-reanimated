#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/style/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <iomanip>
#include <regex>
#include <sstream>
#include <string>
#include <unordered_map>

namespace reanimated {

using namespace worklets;

struct CSSAngle : public CSSSimpleValue<CSSAngle> {
  double value;

  CSSAngle();
  explicit CSSAngle(double value);
  explicit CSSAngle(const std::string &rotationString);
  explicit CSSAngle(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  jsi::Value toJSIValue(jsi::Runtime &rt) const override;
  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSAngle interpolate(double progress, const CSSAngle &to) const override;

  bool operator==(const CSSAngle &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSAngle &angleValue);
#endif // NDEBUG
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
