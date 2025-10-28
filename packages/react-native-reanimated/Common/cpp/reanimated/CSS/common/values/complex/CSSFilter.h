#pragma once

#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/complex/CSSDropShadow.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <optional>
#include <string>
#include <vector>

namespace reanimated::css {

class CSSFilter : public CSSSimpleValue<CSSFilter> {
 public:
  std::optional<CSSDouble> blur;
  std::optional<CSSDouble> brightness;
  std::optional<CSSDouble> contrast;
  std::optional<CSSDouble> grayscale;
  std::optional<CSSDouble> hueRotate;
  std::optional<CSSDouble> invert;
  std::optional<CSSDouble> opacity;
  std::optional<CSSDouble> saturate;
  std::optional<CSSDouble> sepia;
  std::optional<CSSDropShadow> dropShadow;

  CSSFilter() = default;

  CSSFilter(
      std::optional<CSSDouble> blur,
      std::optional<CSSDouble> brightness,
      std::optional<CSSDouble> contrast,
      std::optional<CSSDouble> grayscale,
      std::optional<CSSDouble> hueRotate,
      std::optional<CSSDouble> invert,
      std::optional<CSSDouble> opacity,
      std::optional<CSSDouble> saturate,
      std::optional<CSSDouble> sepia,
      std::optional<CSSDropShadow> dropShadow);

  explicit CSSFilter(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSFilter(const folly::dynamic &value);

  static bool canConstruct(const folly::dynamic &value);
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  folly::dynamic toDynamic() const;
  std::string toString() const;

  CSSFilter interpolate(double progress, const CSSFilter &to) const;

  bool operator==(const CSSFilter &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSFilter &filterValue);
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
