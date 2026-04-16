#include <reanimated/CSS/common/values/complex/CSSBoxShadow.h>

#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSBoxShadow::CSSBoxShadow(
    CSSDouble offsetX,
    CSSDouble offsetY,
#ifdef ANDROID
    CSSShadowRadiusAndroid blurRadius,
#else
    CSSDouble blurRadius,
#endif
    CSSDouble spreadDistance,
    CSSColor color,
    std::optional<CSSBoolean> inset)
    : offsetX(std::move(offsetX)),
      offsetY(std::move(offsetY)),
      blurRadius(std::move(blurRadius)),
      spreadDistance(std::move(spreadDistance)),
      color(std::move(color)),
      inset(std::move(inset)) {
}

CSSBoxShadow::CSSBoxShadow(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  const auto &obj = jsiValue.asObject(rt);

  // Only assign fields that exist in the object and keep default values for
  // others
  if (obj.hasProperty(rt, "offsetX")) {
    offsetX = CSSDouble(rt, obj.getProperty(rt, "offsetX"));
  }
  if (obj.hasProperty(rt, "offsetY")) {
    offsetY = CSSDouble(rt, obj.getProperty(rt, "offsetY"));
  }
  if (obj.hasProperty(rt, "blurRadius")) {
#ifdef ANDROID
    blurRadius = CSSShadowRadiusAndroid(rt, obj.getProperty(rt, "blurRadius"));
#else
    blurRadius = CSSDouble(rt, obj.getProperty(rt, "blurRadius"));
#endif
  }
  if (obj.hasProperty(rt, "spreadDistance")) {
    spreadDistance = CSSDouble(rt, obj.getProperty(rt, "spreadDistance"));
  }
  if (obj.hasProperty(rt, "color")) {
    color = CSSColor(rt, obj.getProperty(rt, "color"));
  }
  // Every non-default (not empty) shadow must have an inset
  inset = CSSBoolean(rt, obj.hasProperty(rt, "inset") ? obj.getProperty(rt, "inset") : false);
}

CSSBoxShadow::CSSBoxShadow(const folly::dynamic &value) {
  // Only assign fields that exist in the object and keep default values for
  // others
  if (value.count("offsetX") > 0) {
    offsetX = CSSDouble(value["offsetX"]);
  }
  if (value.count("offsetY") > 0) {
    offsetY = CSSDouble(value["offsetY"]);
  }
  if (value.count("blurRadius") > 0) {
#ifdef ANDROID
    blurRadius = CSSShadowRadiusAndroid(value["blurRadius"]);
#else
    blurRadius = CSSDouble(value["blurRadius"]);
#endif
  }
  if (value.count("spreadDistance") > 0) {
    spreadDistance = CSSDouble(value["spreadDistance"]);
  }
  if (value.count("color") > 0) {
    color = CSSColor(value["color"]);
  }
  // Every non-default (not empty) shadow must have an inset
  inset = CSSBoolean(value.count("inset") > 0 ? value["inset"] : false);
}

bool CSSBoxShadow::canConstruct(const folly::dynamic &value) {
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

bool CSSBoxShadow::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
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

folly::dynamic CSSBoxShadow::toDynamic() const {
  folly::dynamic obj = folly::dynamic::object();

  obj["offsetX"] = offsetX.toDynamic();
  obj["offsetY"] = offsetY.toDynamic();
  obj["blurRadius"] = blurRadius.toDynamic();
  obj["spreadDistance"] = spreadDistance.toDynamic();
  obj["color"] = color.toDynamic();
  if (inset.has_value()) {
    obj["inset"] = inset->toDynamic();
  }

  return obj;
}

std::string CSSBoxShadow::toString() const {
  return (inset.has_value() && inset.value().value ? "inset " : "") + offsetX.toString() + " " + offsetY.toString() +
      " " + blurRadius.toString() + " " + spreadDistance.toString() + " " + color.toString();
}

CSSBoxShadow CSSBoxShadow::interpolate(double progress, const CSSBoxShadow &to) const {
  const auto &fromInset = inset.value_or(to.inset.value_or(CSSBoolean(false)));
  const auto &toInset = to.inset.value_or(inset.value_or(CSSBoolean(false)));

  return CSSBoxShadow(
      offsetX.interpolate(progress, to.offsetX),
      offsetY.interpolate(progress, to.offsetY),
      blurRadius.interpolate(progress, to.blurRadius),
      spreadDistance.interpolate(progress, to.spreadDistance),
      color.interpolate(progress, to.color),
      fromInset.interpolate(progress, toInset));
}

bool CSSBoxShadow::canInterpolateTo(const CSSBoxShadow &to) const {
  return !inset.has_value() || !to.inset.has_value() || inset.value() == to.inset.value();
}

bool CSSBoxShadow::operator==(const CSSBoxShadow &other) const {
  return offsetX == other.offsetX && offsetY == other.offsetY && blurRadius == other.blurRadius &&
      spreadDistance == other.spreadDistance && color == other.color && inset == other.inset;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSBoxShadow &shadowValue) {
  os << "CSSBoxShadow(" << shadowValue.toString() << ")";
  return os;
}

#endif // NDEBUG

const std::vector<FieldValidator> CSSBoxShadow::fieldValidators = {
    {"offsetX",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"offsetY",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"blurRadius",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"spreadDistance",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"color",
     [](const folly::dynamic &val) { return CSSColor::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSColor::canConstruct(rt, val);
     }},
    {"inset",
     [](const folly::dynamic &val) { return CSSBoolean::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSBoolean::canConstruct(rt, val);
     }}};

} // namespace reanimated::css
