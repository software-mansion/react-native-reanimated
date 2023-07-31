#include "JsiUtils.h"
#include <cxxabi.h>
#include <vector>

using namespace facebook;

namespace reanimated::jsi_utils {

jsi::Array convertStringToArray(
    jsi::Runtime &rt,
    const std::string &value,
    const unsigned int expectedSize) {
  std::vector<float> transformMatrixList;
  std::istringstream stringStream(value);
  std::copy(
      std::istream_iterator<float>(stringStream),
      std::istream_iterator<float>(),
      std::back_inserter(transformMatrixList));
  assert(transformMatrixList.size() == expectedSize);
  jsi::Array matrix(rt, expectedSize);
  for (unsigned int i = 0; i < expectedSize; i++) {
    matrix.setValueAtIndex(rt, i, transformMatrixList[i]);
  }
  return matrix;
}

std::string JSIParser::stringifyValue(
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
    return stringifyComplexValue(rt, value.getObject(rt));
  } else {
    return "[jsi::Value]";
  }
}

std::string JSIParser::stringifyComplexValue(
    jsi::Runtime &rt,
    const jsi::Object &object) {
  if (object.isArray(rt)) {
    return stringifyJSIArray(rt, object.getArray(rt));
  } else if (object.isFunction(rt)) {
    return stringifyJSIFunction(rt, object.getFunction(rt));
  } else if (object.isHostObject(rt)) {
    return stringifyJSIHostObject(rt, *object.asHostObject(rt).get());
  } else {
    return stringifyJSIObject(rt, object);
  }
}

std::string JSIParser::stringifyJSIArray(
    jsi::Runtime &rt,
    const jsi::Array &arr) {
  std::stringstream ss;
  ss << "[";

  auto length = arr.size(rt);

  for (size_t i = 0; i < length; i++) {
    jsi::Value element = arr.getValueAtIndex(rt, i);
    ss << stringifyValue(rt, element) << ", ";
  }

  if (length > 0) {
    ss.seekp(-2, ss.cur);
  }
  ss << "] ";

  return ss.str();
}

std::string JSIParser::stringifyJSIFunction(
    jsi::Runtime &rt,
    const jsi::Function &func) {
  std::stringstream ss;
  auto name = func.getProperty(rt, "name").toString(rt).utf8(rt);
  ss << "[Function " << name << "]";
  return ss.str();
}

std::string JSIParser::stringifyJSIHostObject(
    jsi::Runtime &rt,
    jsi::HostObject &hostObject) {
  std::stringstream ss;
  int status;
  const char *hostObjClassName =
      abi::__cxa_demangle(typeid(hostObject).name(), NULL, NULL, &status);
  if (status == 0) {
    // create a plain jsi::Object
    facebook::jsi::Object obj(rt);

    // copy properties from hostObject to obj
    for (auto &key : hostObject.getPropertyNames(rt)) {
      facebook::jsi::Value value = hostObject.get(rt, key);
      obj.setProperty(rt, key, value);
    }

    ss << '{' << '"' << "class" << '"' << ": " << '"' << hostObjClassName << '"'
       << ", " << '"' << "props" << '"' << ": "
       << stringifyComplexValue(rt, obj) << '}';
  } else {
    ss << "[jsi::HostObject]";
  }
  return ss.str();
}

std::string JSIParser::stringifyJSIObject(
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
       << stringifyValue(rt, object.getProperty(rt, propName)) << ", ";
  }

  if (propsCount > 0) {
    ss.seekp(-2, ss.cur);
  }
  ss << "} ";

  return ss.str();
}

} // namespace reanimated::jsi_utils
