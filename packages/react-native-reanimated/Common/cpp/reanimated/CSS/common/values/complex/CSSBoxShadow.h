#pragma once

#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <worklets/Tools/JSISerializer.h>

#include <folly/json.h>
#include <functional>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

using namespace worklets;

struct CSSBoxShadow : public CSSSimpleValue<CSSBoxShadow> {
  CSSDouble offsetX;
  CSSDouble offsetY;
#ifdef ANDROID
  // For some reason Android crashes when blurRadius is smaller
  // than 1, so we use a custom value type that will never be
  // smaller than 1
  CSSShadowRadiusAndroid blurRadius;
#else
  CSSDouble blurRadius;
#endif
  CSSDouble spreadDistance;
  CSSColor color;
  // inset has no default value - it must be the same as in the other
  // keyframe if it's not set
  std::optional<CSSBoolean> inset;

  CSSBoxShadow() = default;
  explicit CSSBoxShadow(
      CSSDouble offsetX,
      CSSDouble offsetY,
#ifdef ANDROID
      CSSShadowRadiusAndroid blurRadius,
#else
      CSSDouble blurRadius,
#endif
      CSSDouble spreadDistance,
      CSSColor color,
      std::optional<CSSBoolean> inset);
  explicit CSSBoxShadow(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSBoxShadow(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSBoxShadow interpolate(double progress, const CSSBoxShadow &to)
      const override;
  bool canInterpolateTo(const CSSBoxShadow &to) const override;

  bool operator==(const CSSBoxShadow &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSBoxShadow &shadowValue);
#endif // NDEBUG

 private:
  struct FieldValidator {
    std::string fieldName;
    std::function<bool(const folly::dynamic &)> validateDynamic;
    std::function<bool(jsi::Runtime &, const jsi::Value &)> validateJSI;
  };

  static const std::vector<FieldValidator> fieldValidators;
};

} // namespace reanimated::css
