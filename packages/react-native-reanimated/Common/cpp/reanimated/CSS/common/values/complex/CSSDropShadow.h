#pragma once

#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/CSSColor.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <optional>
#include <string>
#include <vector>

namespace reanimated::css {

class CSSDropShadow : public CSSSimpleValue<CSSDropShadow> {
 public:
  CSSDouble offsetX;
  CSSDouble offsetY;
  CSSDouble standardDeviation; // equivalent to blur radius
  CSSColor color;

  CSSDropShadow(
      CSSDouble offsetX,
      CSSDouble offsetY,
      CSSDouble standardDeviation,
      CSSColor color);

  explicit CSSDropShadow(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSDropShadow(const folly::dynamic &value);
  CSSDropShadow() = default;

  static bool canConstruct(const folly::dynamic &value);
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  folly::dynamic toDynamic() const;
  std::string toString() const;

  CSSDropShadow interpolate(double progress, const CSSDropShadow &to) const;

  bool operator==(const CSSDropShadow &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSDropShadow &shadow);
#endif // NDEBUG

 private:
  struct FieldValidator {
    const char *fieldName;
    std::function<bool(const folly::dynamic &)> validateDynamic;
    std::function<bool(jsi::Runtime &, const jsi::Value &)> validateJSI;
  };

  static const std::vector<FieldValidator> fieldValidators;
};

} // namespace reanimated::css
