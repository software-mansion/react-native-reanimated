#include "JSISerializer.h"
#include <cxxabi.h>

std::string reanimated::stringifyValue(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return stringifyValueRecursively(rt, value);
}

std::string reanimated::stringifyValueRecursively(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  if (value.isBool() || value.isNumber()) {
    return value.toString(rt).utf8(rt);
  } else if (value.isString()) {
    return '"' + value.getString(rt).utf8(rt) + '"';
  } else if (value.isUndefined()) {
    return "undefined";
  } else if (value.isNull()) {
    return "null";
  } else if (value.isObject()) {
    jsi::Object object = value.asObject(rt);

    if (object.isArray(rt)) {
      return stringifyJSIArray(rt, object.getArray(rt));
    } else if (object.isFunction(rt)) {
      return stringifyJSIFunction(rt, object.getFunction(rt));
    } else if (object.isHostObject(rt)) {
      return stringifyJSIHostObject(rt, *object.asHostObject(rt).get());
    } else {
      return stringifyJSIObject(rt, object);
    }
  } else {
    return "[jsi::Value]";
  }
}

std::string reanimated::stringifyJSIArray(
    jsi::Runtime &rt,
    const jsi::Array &arr) {
  std::stringstream ss;
  ss << "[";

  auto length = arr.size(rt);

  for (size_t i = 0; i < length; i++) {
    jsi::Value element = arr.getValueAtIndex(rt, i);
    ss << stringifyValueRecursively(rt, element) << ", ";
  }

  if (length > 0) {
    ss.seekp(-2, ss.cur);
  }
  ss << "] ";

  return ss.str();
}

std::string reanimated::stringifyJSIFunction(
    jsi::Runtime &rt,
    const jsi::Function &func) {
  std::stringstream ss;
  auto name = func.getProperty(rt, "name").toString(rt).utf8(rt);
  ss << "[Function " << name << "]";
  return ss.str();
}

std::string reanimated::stringifyJSIHostObject(
    jsi::Runtime &rt,
    jsi::HostObject &hostObject) {
  std::stringstream ss;
  int status;
  const char *hostObjClassName =
      abi::__cxa_demangle(typeid(hostObject).name(), NULL, NULL, &status);
  if (status == 0) {
    auto props = hostObject.getPropertyNames(rt);
    auto propsCount = props.size();

    ss << '[' << hostObjClassName << ' ';
    if (propsCount > 0) {
      ss << "{";
      for (auto &key : props) {
        facebook::jsi::Value value = hostObject.get(rt, key);
        ss << '"' << key.utf8(rt) << '"' << ": "
           << stringifyValueRecursively(rt, value) << ", ";
      }
      ss.seekp(-2, ss.cur);
      ss << "}";
    }
    ss << ']';
  } else {
    ss << "[jsi::HostObject]";
  }
  return ss.str();
}

std::string reanimated::stringifyJSIObject(
    jsi::Runtime &rt,
    const jsi::Object &object) {
  std::stringstream ss;

  // just iterate through properties
  ss << "{";

  auto props = object.getPropertyNames(rt);
  auto propsCount = props.size(rt);

  for (size_t i = 0; i < propsCount; i++) {
    jsi::String propName = props.getValueAtIndex(rt, i).toString(rt);
    ss << '"' << propName.utf8(rt) << '"' << ": "
       << stringifyValueRecursively(rt, object.getProperty(rt, propName))
       << ", ";
  }

  if (propsCount > 0) {
    ss.seekp(-2, ss.cur);
  }
  ss << "} ";

  return ss.str();
}
