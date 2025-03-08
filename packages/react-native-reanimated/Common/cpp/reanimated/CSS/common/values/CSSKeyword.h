#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>

namespace reanimated::css {

using namespace worklets;

template <typename TValue>
class CSSKeywordBase : public CSSSimpleValue<TValue> {
 public:
  static constexpr bool is_discrete_value = true;

  CSSKeywordBase() = default;
  explicit CSSKeywordBase(const char *value);
  explicit CSSKeywordBase(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSKeywordBase(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  bool operator==(const CSSKeywordBase &other) const;

 protected:
  std::string value;
};

struct CSSKeyword : public CSSKeywordBase<CSSKeyword> {
  using CSSKeywordBase<CSSKeyword>::CSSKeywordBase;
  using CSSKeywordBase<CSSKeyword>::canConstruct;

  CSSKeyword interpolate(double progress, const CSSKeyword &to) const override;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSKeyword &keywordValue);
#endif // NDEBUG
};

struct CSSDisplay : public CSSKeywordBase<CSSDisplay> {
  using CSSKeywordBase<CSSDisplay>::CSSKeywordBase;
  using CSSKeywordBase<CSSDisplay>::canConstruct;

  CSSDisplay interpolate(double progress, const CSSDisplay &to) const override;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSDisplay &displayValue);
#endif // NDEBUG
};

} // namespace reanimated::css
