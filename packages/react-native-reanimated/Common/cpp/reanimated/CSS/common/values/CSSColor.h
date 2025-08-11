#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <worklets/Tools/JSISerializer.h>

#include <folly/json.h>
#include <string>

namespace reanimated::css {

using namespace worklets;

enum class ColorType {
  Rgba,
  Transparent,
  CurrentColor, // for SVG
};

struct CSSColor : public CSSSimpleValue<CSSColor> {
  ColorChannels channels;
  ColorType colorType;

  static const CSSColor Transparent;

  CSSColor();
  explicit CSSColor(ColorType colorType);
  explicit CSSColor(int64_t numberValue);
  explicit CSSColor(const std::string &colorString);

  explicit CSSColor(uint8_t r, uint8_t g, uint8_t b);
  explicit CSSColor(uint8_t r, uint8_t g, uint8_t b, uint8_t a);
  explicit CSSColor(const ColorChannels &colorChannels);

  explicit CSSColor(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSColor(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSColor interpolate(double progress, const CSSColor &to) const override;

  static uint8_t interpolateChannel(uint8_t from, uint8_t to, double progress);

  bool operator==(const CSSColor &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSColor &colorValue);
#endif // NDEBUG

 private:
  static bool isValidColorString(const std::string &colorString);
};

inline const CSSColor CSSColor::Transparent(ColorType::Transparent);

} // namespace reanimated::css
