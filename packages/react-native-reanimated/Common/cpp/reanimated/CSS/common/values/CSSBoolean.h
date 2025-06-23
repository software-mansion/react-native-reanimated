#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <string>

namespace reanimated::css {

struct CSSBoolean : public CSSSimpleValue<CSSBoolean> {
  bool value;

  CSSBoolean();
  explicit CSSBoolean(bool value);
  explicit CSSBoolean(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSBoolean(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

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

} // namespace reanimated::css
