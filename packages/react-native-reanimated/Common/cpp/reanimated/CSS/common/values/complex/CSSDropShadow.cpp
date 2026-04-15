#include <reanimated/CSS/common/values/complex/CSSDropShadow.h>

#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSDropShadow::CSSDropShadow(CSSDouble offsetX, CSSDouble offsetY, CSSDouble standardDeviation, CSSColor color)
    : offsetX(std::move(offsetX)),
      offsetY(std::move(offsetY)),
      standardDeviation(std::move(standardDeviation)),
      color(std::move(color)) {}

CSSDropShadow::CSSDropShadow(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  const auto &obj = jsiValue.asObject(rt);

  if (obj.hasProperty(rt, "offsetX")) {
    offsetX = CSSDouble(rt, obj.getProperty(rt, "offsetX"));
  }
  if (obj.hasProperty(rt, "offsetY")) {
    offsetY = CSSDouble(rt, obj.getProperty(rt, "offsetY"));
  }
  if (obj.hasProperty(rt, "standardDeviation")) {
    standardDeviation = CSSDouble(rt, obj.getProperty(rt, "standardDeviation"));
  }
  if (obj.hasProperty(rt, "color")) {
    color = CSSColor(rt, obj.getProperty(rt, "color"));
  }
}

CSSDropShadow::CSSDropShadow(const folly::dynamic &value) {
  if (value.count("offsetX") > 0) {
    offsetX = CSSDouble(value["offsetX"]);
  }
  if (value.count("offsetY") > 0) {
    offsetY = CSSDouble(value["offsetY"]);
  }
  if (value.count("standardDeviation") > 0) {
    standardDeviation = CSSDouble(value["standardDeviation"]);
  }
  if (value.count("color") > 0) {
    color = CSSColor(value["color"]);
  }
}

bool CSSDropShadow::canConstruct(const folly::dynamic &value) {
  if (!value.isObject()) {
    return false;
  }

  for (const auto &validator : fieldValidators) {
    if (value.count(validator.fieldName) > 0 && !validator.validateDynamic(value[validator.fieldName])) {
      return false;
    }
  }
  return true;
}

bool CSSDropShadow::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!jsiValue.isObject()) {
    return false;
  }

  const auto &obj = jsiValue.asObject(rt);

  for (const auto &validator : fieldValidators) {
    const auto &fieldName = validator.fieldName.c_str();
    if (obj.hasProperty(rt, fieldName) && !validator.validateJSI(rt, obj.getProperty(rt, fieldName))) {
      return false;
    }
  }
  return true;
}
folly::dynamic CSSDropShadow::toDynamic() const {
  folly::dynamic obj = folly::dynamic::object();

  obj["offsetX"] = offsetX.toDynamic();
  obj["offsetY"] = offsetY.toDynamic();
  obj["standardDeviation"] = standardDeviation.toDynamic();
  obj["color"] = color.toDynamic();
  return obj;
}
std::string CSSDropShadow::toString() const {
  return "drop-shadow(" + offsetX.toString() + " " + offsetY.toString() + " " + standardDeviation.toString() + " " +
      color.toString() + ")";
}

CSSDropShadow CSSDropShadow::interpolate(double progress, const CSSDropShadow &to) const {
  return CSSDropShadow(
      offsetX.interpolate(progress, to.offsetX),
      offsetY.interpolate(progress, to.offsetY),
      standardDeviation.interpolate(progress, to.standardDeviation),
      color.interpolate(progress, to.color));
}

bool CSSDropShadow::operator==(const CSSDropShadow &other) const {
  return offsetX == other.offsetX && offsetY == other.offsetY && standardDeviation == other.standardDeviation &&
      color == other.color;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSDropShadow &shadowValue) {
  os << "CSSDropShadow(" << shadowValue.toString() << ")";
  return os;
}

#endif // NDEBUG

const std::vector<FieldValidator> CSSDropShadow::fieldValidators = {
    {"offsetX",
     [](const folly::dynamic &value) { return CSSDouble::canConstruct(value); },
     [](jsi::Runtime &rt, const jsi::Value &jsiValue) {
       return CSSDouble::canConstruct(rt, jsiValue);
     }},
    {"offsetY",
     [](const folly::dynamic &value) { return CSSDouble::canConstruct(value); },
     [](jsi::Runtime &rt, const jsi::Value &jsiValue) {
       return CSSDouble::canConstruct(rt, jsiValue);
     }},
    {"standardDeviation",
     [](const folly::dynamic &value) { return CSSDouble::canConstruct(value); },
     [](jsi::Runtime &rt, const jsi::Value &jsiValue) {
       return CSSDouble::canConstruct(rt, jsiValue);
     }},
    {"color",
     [](const folly::dynamic &value) { return CSSColor::canConstruct(value); },
     [](jsi::Runtime &rt, const jsi::Value &jsiValue) {
       return CSSColor::canConstruct(rt, jsiValue);
     }},
};

} // namespace reanimated::css
