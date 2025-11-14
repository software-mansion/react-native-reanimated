#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <string>

namespace reanimated::css {

// Base class with common color value functionality

template <typename T>
concept ColorTypeEnum = std::is_enum_v<T> && requires {
  T::Rgba;
  T::Transparent;
};

template <ColorTypeEnum TColorType, typename TDerived>
struct CSSColorBase : public CSSSimpleValue<TDerived> {
  ColorChannels channels;
  TColorType colorType;

  CSSColorBase();
  explicit CSSColorBase(TColorType colorType);
  explicit CSSColorBase(int64_t numberValue);
  explicit CSSColorBase(bool value);

  explicit CSSColorBase(uint8_t r, uint8_t g, uint8_t b, uint8_t a);
  explicit CSSColorBase(ColorChannels colorChannels);

  TDerived interpolate(double progress, const TDerived &to) const override;

  bool operator==(const TDerived &other) const;
};

// Enum class for color type

enum class CSSColorType : std::uint8_t {
  Rgba,
  Transparent,
};

struct CSSColor : public CSSColorBase<CSSColorType, CSSColor> {
  using CSSColorBase<CSSColorType, CSSColor>::CSSColorBase;
  using CSSColorBase<CSSColorType, CSSColor>::operator==;

  explicit CSSColor(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSColor(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSColor &colorValue);
#endif // NDEBUG
};

} // namespace reanimated::css
