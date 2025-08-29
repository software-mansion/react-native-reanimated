#include <reanimated/CSS/common/values/complex/CSSBoxShadow.h>

namespace reanimated::css {

CSSBoxShadow::CSSBoxShadow(
    CSSDouble offsetX,
    CSSDouble offsetY,
    CSSDouble blurRadius,
    CSSDouble spreadDistance,
    CSSColor color,
    std::optional<CSSBoolean> inset)
    : offsetX(std::move(offsetX)),
      offsetY(std::move(offsetY)),
      blurRadius(std::move(blurRadius)),
      spreadDistance(std::move(spreadDistance)),
      color(std::move(color)),
      inset(std::move(inset)) {}

CSSBoxShadow::CSSBoxShadow(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!canConstruct(rt, jsiValue)) {
    throw std::invalid_argument(
        "[Reanimated] CSSBoxShadow: Invalid value: " +
        stringifyJSIValue(rt, jsiValue));
  }

  const auto &obj = jsiValue.asObject(rt);

  // Only assign fields that exist in the object, others keep their default
  // values
  if (obj.hasProperty(rt, "offsetX")) {
    offsetX = CSSDouble(rt, obj.getProperty(rt, "offsetX"));
  }
  if (obj.hasProperty(rt, "offsetY")) {
    offsetY = CSSDouble(rt, obj.getProperty(rt, "offsetY"));
  }
  if (obj.hasProperty(rt, "blurRadius")) {
    blurRadius = CSSDouble(rt, obj.getProperty(rt, "blurRadius"));
  }
  if (obj.hasProperty(rt, "spreadDistance")) {
    spreadDistance = CSSDouble(rt, obj.getProperty(rt, "spreadDistance"));
  }
  if (obj.hasProperty(rt, "color")) {
    color = CSSColor(rt, obj.getProperty(rt, "color"));
  }
  if (obj.hasProperty(rt, "inset")) {
    inset = CSSBoolean(rt, obj.getProperty(rt, "inset"));
  }
}

CSSBoxShadow::CSSBoxShadow(const folly::dynamic &value) {
  if (!canConstruct(value)) {
    throw std::invalid_argument(
        "[Reanimated] CSSBoxShadow: Invalid value: " + folly::toJson(value));
  }

  // Only assign fields that exist in the object, others keep their default
  // values
  if (value.count("offsetX") > 0) {
    offsetX = CSSDouble(value["offsetX"]);
  }
  if (value.count("offsetY") > 0) {
    offsetY = CSSDouble(value["offsetY"]);
  }
  if (value.count("blurRadius") > 0) {
    blurRadius = CSSDouble(value["blurRadius"]);
  }
  if (value.count("spreadDistance") > 0) {
    spreadDistance = CSSDouble(value["spreadDistance"]);
  }
  if (value.count("color") > 0) {
    color = CSSColor(value["color"]);
  }
  if (value.count("inset") > 0) {
    inset = CSSBoolean(value["inset"]);
  }
}

bool CSSBoxShadow::canConstruct(const folly::dynamic &value) {
  if (!value.isObject()) {
    return false;
  }

  for (const auto &validator : fieldValidators) {
    if (value.count(validator.fieldName) > 0 &&
        !validator.validateDynamic(value[validator.fieldName])) {
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
    if (obj.hasProperty(rt, fieldName) &&
        !validator.validateJSI(rt, obj.getProperty(rt, fieldName))) {
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
  return (inset.has_value() ? inset->toString() + " " : "") +
      offsetX.toString() + " " + offsetY.toString() + " " +
      blurRadius.toString() + " " + spreadDistance.toString() + " " +
      color.toString();
}

CSSBoxShadow CSSBoxShadow::interpolate(double progress, const CSSBoxShadow &to)
    const {
  const auto &fromInset = inset.value_or(to.inset.value_or(CSSBoolean(false)));
  const auto &toInset = to.inset.value_or(inset.value_or(CSSBoolean(false)));

  if (fromInset != toInset) {
    // Cannot interpolate between inset and non-inset, fallback to discrete
    // interpolation
    return progress < 0.5 ? *this : to;
  }

  return CSSBoxShadow(
      offsetX.interpolate(progress, to.offsetX),
      offsetY.interpolate(progress, to.offsetY),
      blurRadius.interpolate(progress, to.blurRadius),
      spreadDistance.interpolate(progress, to.spreadDistance),
      color.interpolate(progress, to.color),
      fromInset.interpolate(progress, toInset));
}

bool CSSBoxShadow::operator==(const CSSBoxShadow &other) const {
  return offsetX == other.offsetX && offsetY == other.offsetY &&
      blurRadius == other.blurRadius &&
      spreadDistance == other.spreadDistance && color == other.color &&
      inset == other.inset;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSBoxShadow &shadowValue) {
  os << "CSSBoxShadow(" << shadowValue.toString() << ")";
  return os;
}

#endif // NDEBUG

const std::vector<CSSBoxShadow::FieldValidator> CSSBoxShadow::fieldValidators =
    {{"offsetX",
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
