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
  Color(unsigned char r, unsigned char g, unsigned char b, unsigned char a);
  Color(unsigned char r, unsigned char g, unsigned char b);
  Color(jsi::Runtime &rt, const jsi::Value &value);

  static const Color Transparent;

  std::string toString() const;
  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  Color interpolate(const Color &to, double progress) const;

 private:
  ColorArray channels;
  ColorType type;

  Color(ColorType colorType) : channels{0, 0, 0, 0}, type(colorType) {}
};

} // namespace reanimated
