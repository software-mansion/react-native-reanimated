#include <reanimated/CSS/common/TransformOrigin.h>

namespace reanimated {

TransformOrigin::TransformOrigin() : x(0.), y(0.), z(0.) {}

TransformOrigin::TransformOrigin(
    const std::variant<double, std::string> &x,
    const std::variant<double, std::string> &y,
    const double z)
    : x(valueFromVariant(x)), y(valueFromVariant(y)), z(z) {}

TransformOrigin::TransformOrigin(
    const UnitValue &x,
    const UnitValue &y,
    const UnitValue &z)
    : x(x), y(y), z(z) {}

TransformOrigin::TransformOrigin(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isObject() && value.asObject(rt).isArray(rt)) {
    auto array = value.asObject(rt).asArray(rt);
    if (array.size(rt) == 3) {
      x = UnitValue(rt, array.getValueAtIndex(rt, 0));
      y = UnitValue(rt, array.getValueAtIndex(rt, 1));
      z = array.getValueAtIndex(rt, 2).asNumber();
      return;
    }
  }

  throw std::runtime_error(
      "[Reanimated] TransformOriginInterpolator: unsupported value type: " +
      stringifyJSIValue(rt, value));
}

jsi::Value TransformOrigin::toJSIValue(jsi::Runtime &rt) const {
  return jsi::Array::createWithElements(
      rt, {x.toJSIValue(rt), y.toJSIValue(rt), z.toJSIValue(rt)});
}

UnitValue TransformOrigin::valueFromVariant(
    const std::variant<double, std::string> &variant) {
  if (std::holds_alternative<double>(variant)) {
    return UnitValue(std::get<double>(variant));
  } else {
    return UnitValue(std::get<std::string>(variant));
  }
}

} // namespace reanimated
