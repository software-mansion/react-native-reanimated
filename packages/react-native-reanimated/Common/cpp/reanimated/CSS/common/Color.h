#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/definitions.h>

#include <worklets/Tools/JSISerializer.h>

#include <string>

namespace reanimated {

using namespace worklets;

enum class ColorType {
  Rgba,
  Transparent,
};

class Color {
 public:
  Color();
  explicit Color(uint8_t r, uint8_t g, uint8_t b, uint8_t a);
  explicit Color(uint8_t r, uint8_t g, uint8_t b);
  explicit Color(const ColorArray &colorArray);
  explicit Color(jsi::Runtime &rt, const jsi::Value &value);

  bool operator==(const Color &other) const;

  static const Color Transparent;

  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  std::string toString() const;
  Color interpolate(const Color &to, double progress) const;

 private:
  ColorArray channels;
  ColorType type;

  explicit Color(ColorType colorType) : channels{0, 0, 0, 0}, type(colorType) {}

  static uint8_t interpolateChannel(uint8_t from, uint8_t to, double progress);
};

inline const Color Color::Transparent(ColorType::Transparent);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
