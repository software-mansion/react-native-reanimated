#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>

namespace reanimated {

using namespace worklets;

template <typename TValue>
class CSSKeywordBase : public CSSSimpleValue<TValue> {
 public:
  static constexpr bool is_discrete_value = true;

  CSSKeywordBase();
  explicit CSSKeywordBase(const std::string &value);
  explicit CSSKeywordBase(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  jsi::Value toJSIValue(jsi::Runtime &rt) const override;
  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  bool operator==(const CSSKeywordBase &other) const;

 protected:
  std::string value;
};

struct CSSKeyword : public CSSKeywordBase<CSSKeyword> {
  using CSSKeywordBase<CSSKeyword>::CSSKeywordBase;

  CSSKeyword interpolate(double progress, const CSSKeyword &to) const override;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSKeyword &keywordValue);
#endif // NDEBUG
};

struct CSSDisplay : public CSSKeywordBase<CSSDisplay> {
  using CSSKeywordBase<CSSDisplay>::CSSKeywordBase;

  CSSDisplay interpolate(double progress, const CSSDisplay &to) const override;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSDisplay &displayValue);
#endif // NDEBUG
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
