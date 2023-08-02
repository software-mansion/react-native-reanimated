#include "JSISerializer.h"
#include <cxxabi.h>

bool checkJSCollectionType(
    jsi::Runtime &rt,
    const jsi::Object &obj,
    std::string expectedType) {
  const jsi::Function &getPrototype =
      rt.global()
          .getPropertyAsObject(rt, "Object")
          .getPropertyAsFunction(rt, "getPrototypeOf");

  std::string result = getPrototype.call(rt, obj).toString(rt).utf8(rt);
  std::string pattern = "[object " + expectedType + "]";

  return result == pattern;
}

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
    } else if (checkJSCollectionType(rt, object, "Map")) {
      return stringifyJSMap(rt, object);
    } else if (checkJSCollectionType(rt, object, "Set")) {
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

std::string reanimated::stringifyJSIArrayBuffer(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &buf) {
  // consider logging size or contents
  return "[ArrayBuffer]";
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

std::string reanimated::stringifyJSError(
    jsi::Runtime &rt,
    const jsi::Object &object) {
  std::stringstream ss;
  ss << '[' << object.getProperty(rt, "name").toString(rt).utf8(rt) << ": "
     << object.getProperty(rt, "message").toString(rt).utf8(rt) << ']';

  return ss.str();
}

std::string reanimated::stringifyJSSet(
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

  auto arr = result.asArray(rt);
  auto length = arr.size(rt);

  ss << "Set {";

  for (size_t i = 0; i < length; i++) {
    jsi::Value element = arr.getValueAtIndex(rt, i);
    ss << stringifyValueRecursively(rt, element) << ", ";
  }

  if (length > 0) {
    ss.seekp(-2, ss.cur);
  }
  ss << "} ";

  return ss.str();
}

std::string reanimated::stringifyJSMap(
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
    ss << stringifyValueRecursively(rt, key) << " => "
       << stringifyValueRecursively(rt, value) << ", ";
  }

  if (length > 0) {
    ss.seekp(-2, ss.cur);
  }
  ss << "} ";

  return ss.str();
}
