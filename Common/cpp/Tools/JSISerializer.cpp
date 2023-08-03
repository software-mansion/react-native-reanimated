#include "JSISerializer.h"

#if __APPLE__
#import <TargetConditionals.h>
#endif

#include <cxxabi.h>
#include <iostream>
#include <sstream>

static inline bool
isInstanceOf(jsi::Runtime &rt, jsi::Object &object, const std::string &type) {
  return object.instanceOf(
      rt, rt.global().getPropertyAsFunction(rt, type.c_str()));
}

std::string JSISerializer::stringifyJSIArray(
    jsi::Runtime &rt,
    const jsi::Array &arr) {
  std::stringstream ss;
  ss << '[';

  auto length = arr.size(rt);

  for (size_t i = 0; i < length; i++) {
    jsi::Value element = arr.getValueAtIndex(rt, i);
    ss << stringifyJSIValueRecursively(rt, element);
    if (i != length - 1) {
      ss << ", ";
    }
  }

  ss << ']';

  return ss.str();
}

std::string JSISerializer::stringifyJSIArrayBuffer(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &buf) {
  // TODO: consider logging size or contents
  return "[ArrayBuffer]";
}

std::string JSISerializer::stringifyJSIFunction(
    jsi::Runtime &rt,
    const jsi::Function &func) {
  std::stringstream ss;
  auto name = func.getProperty(rt, "name").toString(rt).utf8(rt);

  ss << (func.isHostFunction(rt) ? "[jsi::HostFunction " : "[Function ");
  ss << (name != "" ? name : "anonymous");
  ss << ']';
  return ss.str();
}

std::string JSISerializer::stringifyJSIHostObject(
    jsi::Runtime &rt,
    jsi::HostObject &hostObject) {
  int status = -1;
  char *hostObjClassName =
      abi::__cxa_demangle(typeid(hostObject).name(), NULL, NULL, &status);
  if (status != 0) {
    return "[jsi::HostObject]";
  }

  std::stringstream ss;
  ss << "[jsi::HostObject(" << hostObjClassName << ") ";
  std::free(hostObjClassName);

  auto props = hostObject.getPropertyNames(rt);
  auto propsCount = props.size();
  auto lastKey = props.back().utf8(rt);

  if (propsCount > 0) {
    ss << '{';
    for (auto &key : props) {
      auto formattedKey = key.utf8(rt);
      auto value = hostObject.get(rt, key);
      ss << '"' << formattedKey << '"' << ": "
         << stringifyJSIValueRecursively(rt, value);
      if (formattedKey != lastKey) {
        ss << ", ";
      }
    }
    ss << '}';
  }
  ss << ']';

  return ss.str();
}

std::string JSISerializer::stringifyJSIObject(
    jsi::Runtime &rt,
    const jsi::Object &object) {
  std::stringstream ss;
  ss << '{';

  auto props = object.getPropertyNames(rt);
  auto propsCount = props.size(rt);

  for (size_t i = 0; i < propsCount; i++) {
    jsi::String propName = props.getValueAtIndex(rt, i).toString(rt);
    ss << '"' << propName.utf8(rt) << '"' << ": "
       << stringifyJSIValueRecursively(rt, object.getProperty(rt, propName));
    if (i != propsCount - 1) {
      ss << ", ";
    }
  }

  ss << '}';

  return ss.str();
}

std::string JSISerializer::stringifyJSError(
    jsi::Runtime &rt,
    const jsi::Object &object) {
  std::stringstream ss;
  ss << '[' << object.getProperty(rt, "name").toString(rt).utf8(rt) << ": "
     << object.getProperty(rt, "message").toString(rt).utf8(rt) << ']';

  return ss.str();
}

std::string JSISerializer::stringifyJSSet(
    jsi::Runtime &rt,
    const jsi::Object &object) {
  std::stringstream ss;
  jsi::Function arrayFrom = rt.global()
                                .getPropertyAsObject(rt, "Array")
                                .getPropertyAsFunction(rt, "from");
  jsi::Object result = arrayFrom.call(rt, object).asObject(rt);

  if (!result.isArray(rt)) {
    return "[Set]";
  }

  ss << "Set {" << stringifyJSIValueRecursively(rt, result.asArray(rt)) << '}';

  return ss.str();
}

std::string JSISerializer::stringifyJSMap(
    jsi::Runtime &rt,
    const jsi::Object &object) {
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
    ss << stringifyJSIValueRecursively(rt, key) << ": "
       << stringifyJSIValueRecursively(rt, value);
    if (i != length - 1) {
      ss << ", ";
    }
  }

  ss << '}';

  return ss.str();
}

std::string JSISerializer::stringifyJSIValueRecursively(
    jsi::Runtime &rt,
    const jsi::Value &value,
    bool topLevel) {
  if (value.isBool() || value.isNumber()) {
    return value.toString(rt).utf8(rt);
  }
  if (value.isString()) {
    return topLevel ? value.getString(rt).utf8(rt)
                    : '"' + value.getString(rt).utf8(rt) + '"';
  }
  if (value.isSymbol()) {
    return value.getSymbol(rt).toString(rt);
  }
#if !TARGET_OS_TV
  if (value.isBigInt()) {
    return value.getBigInt(rt).toString(rt).utf8(rt) + 'n';
  }
#endif
  if (value.isUndefined()) {
    return "undefined";
  }
  if (value.isNull()) {
    return "null";
  }
  if (value.isObject()) {
    jsi::Object object = value.asObject(rt);

    if (this->wasVisited(object)) {
      return "[Recursive object]";
    }
    this->visit(object);

    if (object.isArray(rt)) {
      return stringifyJSIArray(rt, object.getArray(rt));
    }
    if (object.isArrayBuffer(rt)) {
      return stringifyJSIArrayBuffer(rt, object.getArrayBuffer(rt));
    }
    if (object.isFunction(rt)) {
      return stringifyJSIFunction(rt, object.getFunction(rt));
    }
    if (object.isHostObject(rt)) {
      return stringifyJSIHostObject(rt, *object.asHostObject(rt).get());
    }
    if (isInstanceOf(rt, object, "Map")) {
      return stringifyJSMap(rt, object);
    }
    if (isInstanceOf(rt, object, "Set")) {
      return stringifyJSSet(rt, object);
    }
    if (isInstanceOf(rt, object, "Error")) {
      return stringifyJSError(rt, object);
    }
    return stringifyJSIObject(rt, object);
  }

  throw std::runtime_error("unsupported value type");
}

std::string stringifyJSIValue(jsi::Runtime &rt, const jsi::Value &value) {
  JSISerializer serializer(rt);

  return serializer.stringifyJSIValueRecursively(rt, value, true);
}
