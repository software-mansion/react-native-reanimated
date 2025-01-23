#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>

namespace reanimated {

using namespace worklets;

enum class ColorType {
  Rgba,
  Transparent,
};

struct CSSColor : public CSSBaseValue<CSSValueType::Color, CSSColor> {
  ColorChannels channels;
  ColorType colorType;

  static const CSSColor Transparent;

  CSSColor();
  explicit CSSColor(ColorType colorType);
  explicit CSSColor(uint8_t r, uint8_t g, uint8_t b);
  explicit CSSColor(uint8_t r, uint8_t g, uint8_t b, uint8_t a);
  explicit CSSColor(const ColorChannels &colorChannels);
  explicit CSSColor(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  jsi::Value toJSIValue(jsi::Runtime &rt) const override;
  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSColor interpolate(double progress, const CSSColor &to) const override;

  static uint8_t interpolateChannel(uint8_t from, uint8_t to, double progress);

  bool operator==(const CSSColor &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSColor &colorValue);
#endif // NDEBUG
};

inline const CSSColor CSSColor::Transparent(ColorType::Transparent);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
