#include "JSISerializer.h"
#include <cxxabi.h>
#include <sstream>

#include <iostream>

std::string stringifyJSIArray(jsi::Runtime &rt, const jsi::Array &arr) {
  std::stringstream ss;
  ss << '[';

  auto length = arr.size(rt);

  for (size_t i = 0; i < length; i++) {
    jsi::Value element = arr.getValueAtIndex(rt, i);
    ss << stringifyJSIValue(rt, element);
    if (i != length - 1) {
      ss << ", ";
    }
  }

  ss << ']';

  return ss.str();
}

std::string stringifyJSIArrayBuffer(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &buf) {
  // TODO: consider logging size or contents
  return "[ArrayBuffer]";
}

std::string stringifyJSIFunction(jsi::Runtime &rt, const jsi::Function &func) {
  std::stringstream ss;
  auto name = func.getProperty(rt, "name").toString(rt).utf8(rt);
  ss << "[Function " << name << ']';
  return ss.str();
}

std::string stringifyJSIHostObject(
    jsi::Runtime &rt,
    jsi::HostObject &hostObject) {
  int status = -1;
  char *hostObjClassName =
      abi::__cxa_demangle(typeid(hostObject).name(), NULL, NULL, &status);
  if (status != 0) {
    return "[jsi::HostObject]";
  }

  std::stringstream ss;
  auto props = hostObject.getPropertyNames(rt);
  auto propsCount = props.size();
  auto lastKey = props.back().utf8(rt);

  ss << '[' << hostObjClassName << ' ';
  if (propsCount > 0) {
    ss << '{';
    for (auto &key : props) {
      auto formattedKey = key.utf8(rt);
      auto value = hostObject.get(rt, key);
      ss << '"' << formattedKey << '"' << ": " << stringifyJSIValue(rt, value);
      if (formattedKey != lastKey) {
        ss << ", ";
      }
    }
    ss << '}';
  }
  ss << ']';

  std::free(hostObjClassName);
  return ss.str();
}

std::string stringifyJSIObject(jsi::Runtime &rt, const jsi::Object &object) {
  std::stringstream ss;
  ss << '{';

  auto props = object.getPropertyNames(rt);
  auto propsCount = props.size(rt);

  for (size_t i = 0; i < propsCount; i++) {
    jsi::String propName = props.getValueAtIndex(rt, i).toString(rt);
    ss << '"' << propName.utf8(rt) << '"' << ": "
       << stringifyJSIValue(rt, object.getProperty(rt, propName));
    if (i != propsCount - 1) {
      ss << ", ";
    }
  }

  ss << '}';

  return ss.str();
}

std::string stringifyJSError(jsi::Runtime &rt, const jsi::Object &object) {
  std::stringstream ss;
  ss << '[' << object.getProperty(rt, "name").toString(rt).utf8(rt) << ": "
     << object.getProperty(rt, "message").toString(rt).utf8(rt) << ']';

  return ss.str();
}

std::string stringifyJSSet(jsi::Runtime &rt, const jsi::Object &object) {
  std::stringstream ss;
  jsi::Function arrayFrom = rt.global()
                                .getPropertyAsObject(rt, "Array")
                                .getPropertyAsFunction(rt, "from");
  jsi::Object result = arrayFrom.call(rt, object).asObject(rt);

  if (!result.isArray(rt)) {
    return "[Set]";
  }

  ss << "Set {" << stringifyJSIValue(rt, result.asArray(rt)) << '}';

  return ss.str();
}

std::string stringifyJSMap(jsi::Runtime &rt, const jsi::Object &object) {
  std::stringstream ss;
  jsi::Function arrayFrom = rt.global()
                                .getPropertyAsObject(rt, "Array")
                                .getPropertyAsFunction(rt, "from");
  jsi::Object result = arrayFrom.call(rt, object).asObject(rt);

  if (!result.isArray(rt)) {
    return "[Map]";
  }

  auto arr = result.asArray(rt);
  auto length = arr.size(rt);

  ss << "Map {";

  for (size_t i = 0; i < length; i++) {
    auto pair = arr.getValueAtIndex(rt, i).asObject(rt).getArray(rt);
    auto key = pair.getValueAtIndex(rt, 0);
    auto value = pair.getValueAtIndex(rt, 1);
    ss << stringifyJSIValue(rt, key) << ": " << stringifyJSIValue(rt, value);
    if (i != length - 1) {
      ss << ", ";
    }
  }

  ss << '}';

  return ss.str();
}

std::string stringifyJSIValue(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isBool() || value.isNumber()) {
    return value.toString(rt).utf8(rt);
  } else if (value.isString()) {
    return '"' + value.getString(rt).utf8(rt) + '"';
  } else if (value.isSymbol()) {
    return value.getSymbol(rt).toString(rt);
  } else if (value.isBigInt()) {
    return value.getBigInt(rt).toString(rt).utf8(rt) + 'n';
  } else if (value.isUndefined()) {
    return "undefined";
  } else if (value.isNull()) {
    return "null";
  } else if (value.isObject()) {
    jsi::Object object = value.asObject(rt);

    if (object.isArray(rt)) {
      return stringifyJSIArray(rt, object.getArray(rt));
    } else if (object.isArrayBuffer(rt)) {
      return stringifyJSIArrayBuffer(rt, object.getArrayBuffer(rt));
    } else if (object.isFunction(rt)) {
      return stringifyJSIFunction(rt, object.getFunction(rt));
    } else if (object.isHostObject(rt)) {
      return stringifyJSIHostObject(rt, *object.asHostObject(rt).get());
    } else if (object.instanceOf(
                   rt, rt.global().getPropertyAsFunction(rt, "Map"))) {
      return stringifyJSMap(rt, object);
    } else if (object.instanceOf(
                   rt, rt.global().getPropertyAsFunction(rt, "Set"))) {
      return stringifyJSSet(rt, object);
    } else if (object.instanceOf(
                   rt, rt.global().getPropertyAsFunction(rt, "Error"))) {
      return stringifyJSError(rt, object);
    } else {
      return stringifyJSIObject(rt, object);
    }
  } else {
    return "[jsi::Value]";
  }
}
