#pragma once

#include <reanimated/CSS/common/FieldValidator.h>
#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <functional>
#include <string>
#include <vector>

namespace reanimated::css {

using namespace facebook;

struct CSSDropShadow : public CSSSimpleValue<CSSDropShadow> {
  CSSDouble offsetX;
  CSSDouble offsetY;
  CSSDouble standardDeviation;
  CSSColor color;

  CSSDropShadow() = default;

  explicit CSSDropShadow(CSSDouble offsetX, CSSDouble offsetY, CSSDouble standardDeviation, CSSColor color);
  explicit CSSDropShadow(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSDropShadow(const folly::dynamic &value);

  static bool canConstruct(const folly::dynamic &value);
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  CSSDropShadow interpolate(double progress, const CSSDropShadow &to) const override;

  bool operator==(const CSSDropShadow &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSDropShadow &shadowValue);
#endif // NDEBUG

 private:
  static const std::vector<FieldValidator> fieldValidators;
};

} // namespace reanimated::css
