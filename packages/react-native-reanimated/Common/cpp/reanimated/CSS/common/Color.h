#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <worklets/Tools/JSISerializer.h>

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
  Color(uint8_t r, uint8_t g, uint8_t b, uint8_t a);
  Color(uint8_t r, uint8_t g, uint8_t b);
  Color(jsi::Runtime &rt, const jsi::Value &value);

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
