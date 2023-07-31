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

std::string JSIParser::parseValue(jsi::Runtime &rt, jsi::Value const &value) {
  if (value.isBool() || value.isNumber()) {
    return value.toString(rt).utf8(rt);
  } else if (value.isString()) {
    return "\"" + value.getString(rt).utf8(rt) + "\"";
  } else if (value.isUndefined()) {
    return "undefined";
  } else if (value.isObject()) {
    return parseComplexValue(rt, value.getObject(rt));
  } else {
    return "unsupported value type";
  }
}

std::string JSIParser::parseComplexValue(
    jsi::Runtime &rt,
    jsi::Object const &object) {
  if (object.isArray(rt)) {
    return parseJSIArray(rt, object.getArray(rt));
  } else if (object.isFunction(rt)) {
    return parseJSIFunction(rt, object.getFunction(rt));
  } else if (object.isHostObject(rt)) {
    return parseJSIHostObject(rt, *object.asHostObject(rt).get());
  } else {
    return parseJSIObject(rt, object);
  }
}

std::string JSIParser::parseJSIArray(jsi::Runtime &rt, jsi::Array const &arr) {
  std::stringstream parsed;
  parsed << "[";

  size_t length = arr.size(rt);

  for (size_t i = 0; i < length; i++) {
    jsi::Value element = arr.getValueAtIndex(rt, i);
    parsed << parseValue(rt, element) << ", ";
  }

  if (length > 0) {
    parsed.seekp(-2, parsed.cur);
  }
  parsed << "] ";

  return parsed.str();
}

std::string JSIParser::parseJSIFunction(
    jsi::Runtime &rt,
    jsi::Function const &func) {
  std::stringstream parsed;
  parsed << "[Function " << func.getProperty(rt, "name").toString(rt).utf8(rt)
         << "]";
  return parsed.str();
}

std::string JSIParser::parseJSIHostObject(
    jsi::Runtime &rt,
    jsi::HostObject &hostObject) {
  std::stringstream parsed;
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

    parsed << "{\"class\": "
           << "\"" << hostObjClassName << "\""
           << ", \"props\": " << parseComplexValue(rt, obj) << "}";
  } else {
    parsed << "[jsi::HostObject] - error parsing class name";
  }
  return parsed.str();
}

std::string JSIParser::parseJSIObject(
    jsi::Runtime &rt,
    jsi::Object const &object) {
  std::stringstream parsed;

  // just iterate through properties
  parsed << "{";

  jsi::Array props = object.getPropertyNames(rt);
  size_t propsCount = props.size(rt);

  for (size_t i = 0; i < propsCount; i++) {
    jsi::String propName = props.getValueAtIndex(rt, i).toString(rt);
    parsed << "\"" << propName.utf8(rt)
           << "\": " << parseValue(rt, object.getProperty(rt, propName))
           << ", ";
  }

  if (propsCount > 0) {
    parsed.seekp(-2, parsed.cur);
  }
  parsed << "} ";

  return parsed.str();
}

} // namespace reanimated::jsi_utils
