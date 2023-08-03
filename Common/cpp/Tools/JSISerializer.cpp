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

std::string JSISerializer::stringifyJSIArray(const jsi::Array &arr) {
  std::stringstream ss;
  ss << '[';

  auto length = arr.size(rt_);

  for (size_t i = 0; i < length; i++) {
    jsi::Value element = arr.getValueAtIndex(rt_, i);
    ss << stringifyJSIValueRecursively(element);
    if (i != length - 1) {
      ss << ", ";
    }
  }

  ss << ']';

  return ss.str();
}

std::string JSISerializer::stringifyJSIArrayBuffer(
    const jsi::ArrayBuffer &buf) {
  // TODO: consider logging size or contents
  return "[ArrayBuffer]";
}

std::string JSISerializer::stringifyJSIFunction(const jsi::Function &func) {
  std::stringstream ss;
  auto name = func.getProperty(rt_, "name").toString(rt_).utf8(rt_);

  ss << (func.isHostFunction(rt_) ? "[jsi::HostFunction " : "[Function ");
  ss << (name != "" ? name : "anonymous");
  ss << ']';
  return ss.str();
}

std::string JSISerializer::stringifyJSIHostObject(jsi::HostObject &hostObject) {
  int status = -1;
  char *hostObjClassName =
      abi::__cxa_demangle(typeid(hostObject).name(), NULL, NULL, &status);
  if (status != 0) {
    return "[jsi::HostObject]";
  }

  std::stringstream ss;
  ss << "[jsi::HostObject(" << hostObjClassName << ") ";
  std::free(hostObjClassName);

  auto props = hostObject.getPropertyNames(rt_);
  auto propsCount = props.size();
  auto lastKey = props.back().utf8(rt_);

  if (propsCount > 0) {
    ss << '{';
    for (auto &key : props) {
      auto formattedKey = key.utf8(rt_);
      auto value = hostObject.get(rt_, key);
      ss << '"' << formattedKey << '"' << ": "
         << stringifyJSIValueRecursively(value);
      if (formattedKey != lastKey) {
        ss << ", ";
      }
    }
    ss << '}';
  }
  ss << ']';

  return ss.str();
}

std::string JSISerializer::stringifyJSIObject(const jsi::Object &object) {
  std::stringstream ss;
  ss << '{';

  auto props = object.getPropertyNames(rt_);
  auto propsCount = props.size(rt_);

  for (size_t i = 0; i < propsCount; i++) {
    jsi::String propName = props.getValueAtIndex(rt_, i).toString(rt_);
    ss << '"' << propName.utf8(rt_) << '"' << ": "
       << stringifyJSIValueRecursively(object.getProperty(rt_, propName));
    if (i != propsCount - 1) {
      ss << ", ";
    }
  }

  ss << '}';

  return ss.str();
}

std::string JSISerializer::stringifyJSError(const jsi::Object &object) {
  std::stringstream ss;
  ss << '[' << object.getProperty(rt_, "name").toString(rt_).utf8(rt_) << ": "
     << object.getProperty(rt_, "message").toString(rt_).utf8(rt_) << ']';

  return ss.str();
}

std::string JSISerializer::stringifyJSSet(const jsi::Object &object) {
  std::stringstream ss;
  jsi::Function arrayFrom = rt_.global()
                                .getPropertyAsObject(rt_, "Array")
                                .getPropertyAsFunction(rt_, "from");
  jsi::Object result = arrayFrom.call(rt_, object).asObject(rt_);

  if (!result.isArray(rt_)) {
    return "[Set]";
  }

  auto arr = result.asArray(rt_);
  auto length = arr.size(rt_);
  ss << "Set {";

  for (size_t i = 0; i < length; i++) {
    ss << stringifyJSIValueRecursively(arr.getValueAtIndex(rt_, i));
    if (i != length - 1) {
      ss << ", ";
    }
  }

  ss << '}';

  return ss.str();
}

std::string JSISerializer::stringifyJSMap(const jsi::Object &object) {
  std::stringstream ss;
  jsi::Function arrayFrom = rt_.global()
                                .getPropertyAsObject(rt_, "Array")
                                .getPropertyAsFunction(rt_, "from");
  jsi::Object result = arrayFrom.call(rt_, object).asObject(rt_);

  if (!result.isArray(rt_)) {
    return "[Map]";
  }

  auto arr = result.asArray(rt_);
  auto length = arr.size(rt_);

  ss << "Map {";

  for (size_t i = 0; i < length; i++) {
    auto pair = arr.getValueAtIndex(rt_, i).asObject(rt_).getArray(rt_);
    auto key = pair.getValueAtIndex(rt_, 0);
    auto value = pair.getValueAtIndex(rt_, 1);
    ss << stringifyJSIValueRecursively(key) << ": "
       << stringifyJSIValueRecursively(value);
    if (i != length - 1) {
      ss << ", ";
    }
  }

  ss << '}';

  return ss.str();
}

std::string JSISerializer::stringifyRecursiveType(const jsi::Object &object) {
  std::stringstream ss;

  auto type = object.getPropertyAsObject(rt_, "constructor")
                  .getProperty(rt_, "name")
                  .toString(rt_)
                  .utf8(rt_);

  if (type == "Array") {
    return "[...]";
  }
  if (type == "Object") {
    return "{...}";
  }
  return "...";
}

std::string JSISerializer::stringifyJSIValueRecursively(
    const jsi::Value &value,
    bool topLevel) {
  if (value.isBool() || value.isNumber()) {
    return value.toString(rt_).utf8(rt_);
  }
  if (value.isString()) {
    return topLevel ? value.getString(rt_).utf8(rt_)
                    : '"' + value.getString(rt_).utf8(rt_) + '"';
  }
  if (value.isSymbol()) {
    return value.getSymbol(rt_).toString(rt_);
  }
#if !TARGET_OS_TV
  if (value.isBigInt()) {
    return value.getBigInt(rt_).toString(rt_).utf8(rt_) + 'n';
  }
#endif
  if (value.isUndefined()) {
    return "undefined";
  }
  if (value.isNull()) {
    return "null";
  }
  if (value.isObject()) {
    jsi::Object object = value.asObject(rt_);

    if (this->wasVisited(object)) {
      return stringifyRecursiveType(object);
    }
    this->visit(object);

    if (object.isArray(rt_)) {
      return stringifyJSIArray(object.getArray(rt_));
    }
    if (object.isArrayBuffer(rt_)) {
      return stringifyJSIArrayBuffer(object.getArrayBuffer(rt_));
    }
    if (object.isFunction(rt_)) {
      return stringifyJSIFunction(object.getFunction(rt_));
    }
    if (object.isHostObject(rt_)) {
      return stringifyJSIHostObject(*object.asHostObject(rt_).get());
    }
    if (isInstanceOf(rt_, object, "Map")) {
      return stringifyJSMap(object);
    }
    if (isInstanceOf(rt_, object, "Set")) {
      return stringifyJSSet(object);
    }
    if (isInstanceOf(rt_, object, "Error")) {
      return stringifyJSError(object);
    }
    return stringifyJSIObject(object);
  }

  throw std::runtime_error("unsupported value type");
}

std::string stringifyJSIValue(jsi::Runtime &rt, const jsi::Value &value) {
  JSISerializer serializer(rt);

  return serializer.stringifyJSIValueRecursively(value, true);
}
