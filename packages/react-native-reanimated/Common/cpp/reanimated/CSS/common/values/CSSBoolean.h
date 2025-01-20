#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>

namespace reanimated {

using namespace worklets;

struct CSSBoolean : public CSSBaseValue<CSSValueType::Boolean, CSSBoolean> {
  bool value;

  CSSBoolean();
  explicit CSSBoolean(bool value);
  explicit CSSBoolean(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  jsi::Value toJSIValue(jsi::Runtime &rt) const override;
  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSBoolean interpolate(double progress, const CSSBoolean &to) const override;

  bool operator==(const CSSBoolean &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSBoolean &boolValue);
#endif // NDEBUG
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
