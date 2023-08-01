#pragma once

#include <jsi/jsi.h>
#include <sstream>
#include <string>

using namespace facebook;

namespace reanimated {

std::string stringifyValue(jsi::Runtime &rt, const jsi::Value &value);
std::string stringifyValueRecursively(
    jsi::Runtime &rt,
    const jsi::Value &value);
std::string stringifyJSIArray(jsi::Runtime &rt, const jsi::Array &arr);
std::string stringifyJSIArrayBuffer(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &buf);
std::string stringifyJSIFunction(jsi::Runtime &rt, const jsi::Function &func);
std::string stringifyJSIHostObject(
    jsi::Runtime &rt,
    jsi::HostObject &hostObject);
std::string stringifyJSIObject(jsi::Runtime &rt, const jsi::Object &object);
std::string stringifyJSError(jsi::Runtime &rt, const jsi::Object &object);
std::string stringifyJSSet(jsi::Runtime &rt, const jsi::Object &object);
std::string stringifyJSMap(jsi::Runtime &rt, const jsi::Object &object);

} // namespace reanimated
