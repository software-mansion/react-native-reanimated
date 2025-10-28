#include <reanimated/CSS/common/values/complex/CSSFilter.h>

#include <utility>

namespace reanimated::css {

CSSFilter::CSSFilter(
    std::optional<CSSDouble> blur,
    std::optional<CSSDouble> brightness,
    std::optional<CSSDouble> contrast,
    std::optional<CSSDouble> grayscale,
    std::optional<CSSDouble> hueRotate,
    std::optional<CSSDouble> invert,
    std::optional<CSSDouble> opacity,
    std::optional<CSSDouble> saturate,
    std::optional<CSSDouble> sepia,
    std::optional<CSSDropShadow> dropShadow)
    : blur(std::move(blur)),
      brightness(std::move(brightness)),
      contrast(std::move(contrast)),
      grayscale(std::move(grayscale)),
      hueRotate(std::move(hueRotate)),
      invert(std::move(invert)),
      opacity(std::move(opacity)),
      saturate(std::move(saturate)),
      sepia(std::move(sepia)),
      dropShadow(std::move(dropShadow)) {}

CSSFilter::CSSFilter(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  const auto &obj = jsiValue.asObject(rt);

  if (obj.hasProperty(rt, "blur")) {
    blur = CSSDouble(rt, obj.getProperty(rt, "blur"));
  }
  if (obj.hasProperty(rt, "brightness")) {
    brightness = CSSDouble(rt, obj.getProperty(rt, "brightness"));
  }
  if (obj.hasProperty(rt, "contrast")) {
    contrast = CSSDouble(rt, obj.getProperty(rt, "contrast"));
  }
  if (obj.hasProperty(rt, "grayscale")) {
    grayscale = CSSDouble(rt, obj.getProperty(rt, "grayscale"));
  }
  if (obj.hasProperty(rt, "hueRotate")) {
    hueRotate = CSSDouble(rt, obj.getProperty(rt, "hueRotate"));
  }
  if (obj.hasProperty(rt, "invert")) {
    invert = CSSDouble(rt, obj.getProperty(rt, "invert"));
  }
  if (obj.hasProperty(rt, "opacity")) {
    opacity = CSSDouble(rt, obj.getProperty(rt, "opacity"));
  }
  if (obj.hasProperty(rt, "saturate")) {
    saturate = CSSDouble(rt, obj.getProperty(rt, "saturate"));
  }
  if (obj.hasProperty(rt, "sepia")) {
    sepia = CSSDouble(rt, obj.getProperty(rt, "sepia"));
  }
  if (obj.hasProperty(rt, "dropShadow")) {
    dropShadow = CSSDropShadow(rt, obj.getProperty(rt, "dropShadow"));
  }
}

CSSFilter::CSSFilter(const folly::dynamic &value) {
  if (value.count("blur") > 0) {
    blur = CSSDouble(value["blur"]);
  }
  if (value.count("brightness") > 0) {
    brightness = CSSDouble(value["brightness"]);
  }
  if (value.count("contrast") > 0) {
    contrast = CSSDouble(value["contrast"]);
  }
  if (value.count("grayscale") > 0) {
    grayscale = CSSDouble(value["grayscale"]);
  }
  if (value.count("hueRotate") > 0) {
    hueRotate = CSSDouble(value["hueRotate"]);
  }
  if (value.count("invert") > 0) {
    invert = CSSDouble(value["invert"]);
  }
  if (value.count("opacity") > 0) {
    opacity = CSSDouble(value["opacity"]);
  }
  if (value.count("saturate") > 0) {
    saturate = CSSDouble(value["saturate"]);
  }
  if (value.count("sepia") > 0) {
    sepia = CSSDouble(value["sepia"]);
  }
  if (value.count("dropShadow") > 0) {
    dropShadow = CSSDropShadow(value["dropShadow"]);
  }
}

bool CSSFilter::canConstruct(const folly::dynamic &value) {
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

bool CSSFilter::canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue) {
  if (!jsiValue.isObject()) {
    return false;
  }

  const auto &obj = jsiValue.asObject(rt);

  for (const auto &validator : fieldValidators) {
    const auto &fieldName = validator.fieldName;
    if (obj.hasProperty(rt, fieldName) &&
        !validator.validateJSI(rt, obj.getProperty(rt, fieldName))) {
      return false;
    }
  }
  return true;
}

folly::dynamic CSSFilter::toDynamic() const {
  folly::dynamic obj = folly::dynamic::object();

  if (blur)
    obj["blur"] = blur->toDynamic();
  if (brightness)
    obj["brightness"] = brightness->toDynamic();
  if (contrast)
    obj["contrast"] = contrast->toDynamic();
  if (grayscale)
    obj["grayscale"] = grayscale->toDynamic();
  if (hueRotate)
    obj["hueRotate"] = hueRotate->toDynamic();
  if (invert)
    obj["invert"] = invert->toDynamic();
  if (opacity)
    obj["opacity"] = opacity->toDynamic();
  if (saturate)
    obj["saturate"] = saturate->toDynamic();
  if (sepia)
    obj["sepia"] = sepia->toDynamic();
  if (dropShadow)
    obj["dropShadow"] = dropShadow->toDynamic();

  return obj;
}

std::string CSSFilter::toString() const {
  std::string str;
  auto append = [&](const std::string &name,
                    const std::optional<CSSDouble> &val,
                    const std::string &unit = "") {
    if (val.has_value()) {
      if (!str.empty())
        str += " ";
      str += name + "(" + val->toString() + unit + ")";
    }
  };

  append("blur", blur, "px");
  append("brightness", brightness);
  append("contrast", contrast);
  append("grayscale", grayscale);
  append("hueRotate", hueRotate, "deg");
  append("invert", invert);
  append("opacity", opacity);
  append("saturate", saturate);
  append("sepia", sepia);

  if (dropShadow.has_value()) {
    if (!str.empty())
      str += " ";
    str += "drop-shadow(" + dropShadow->toString() + ")";
  }

  return str;
}

CSSFilter CSSFilter::interpolate(double progress, const CSSFilter &to) const {
  auto interpolateOpt =
      [&](const std::optional<CSSDouble> &from,
          const std::optional<CSSDouble> &toVal) -> std::optional<CSSDouble> {
    if (from.has_value() && toVal.has_value()) {
      return from->interpolate(progress, toVal.value());
    }
    return from.has_value() ? from : toVal;
  };

  return CSSFilter(
      interpolateOpt(blur, to.blur),
      interpolateOpt(brightness, to.brightness),
      interpolateOpt(contrast, to.contrast),
      interpolateOpt(grayscale, to.grayscale),
      interpolateOpt(hueRotate, to.hueRotate),
      interpolateOpt(invert, to.invert),
      interpolateOpt(opacity, to.opacity),
      interpolateOpt(saturate, to.saturate),
      interpolateOpt(sepia, to.sepia),
      dropShadow.has_value() && to.dropShadow.has_value()
          ? std::optional<CSSDropShadow>(
                dropShadow->interpolate(progress, to.dropShadow.value()))
          : dropShadow.has_value() ? dropShadow
                                   : to.dropShadow);
}

bool CSSFilter::operator==(const CSSFilter &other) const {
  return blur == other.blur && brightness == other.brightness &&
      contrast == other.contrast && grayscale == other.grayscale &&
      hueRotate == other.hueRotate && invert == other.invert &&
      opacity == other.opacity && saturate == other.saturate &&
      sepia == other.sepia && dropShadow == other.dropShadow;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const CSSFilter &filterValue) {
  os << "CSSFilter(" << filterValue.toString() << ")";
  return os;
}
#endif

const std::vector<CSSFilter::FieldValidator> CSSFilter::fieldValidators = {
    {"blur",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"brightness",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"contrast",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"grayscale",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"hueRotate",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"invert",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"opacity",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"saturate",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"sepia",
     [](const folly::dynamic &val) { return CSSDouble::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDouble::canConstruct(rt, val);
     }},
    {"dropShadow",
     [](const folly::dynamic &val) { return CSSDropShadow::canConstruct(val); },
     [](jsi::Runtime &rt, const jsi::Value &val) {
       return CSSDropShadow::canConstruct(rt, val);
     }}};

} // namespace reanimated::css
