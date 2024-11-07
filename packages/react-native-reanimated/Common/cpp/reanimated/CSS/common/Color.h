#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>

namespace reanimated {

using namespace facebook;
using namespace worklets;

enum class ColorType {
  RGBA,
  TRANSPARENT,
};

class Color {
 public:
  Color();
  explicit Color(uint8_t r, uint8_t g, uint8_t b, uint8_t a);
  explicit Color(uint8_t r, uint8_t g, uint8_t b);
  explicit Color(jsi::Runtime &rt, const jsi::Value &value);

  static const Color Transparent;

  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  std::string toString() const;
  Color interpolate(const Color &to, double progress) const;

 private:
  ColorArray channels;
  ColorType type;

  explicit Color(ColorType colorType) : channels{0, 0, 0, 0}, type(colorType) {}
};

} // namespace reanimated
