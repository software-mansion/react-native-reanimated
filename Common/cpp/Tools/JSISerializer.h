#pragma once

#include <jsi/jsi.h>
#include <string>
#include <vector>

using namespace facebook;

namespace {
const std::vector<std::string> SUPPORTED_ERROR_TYPES = {
    "Error",
    "AggregateError",
    "EvalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError",
    "InternalError"};

const std::vector<std::string> SUPPORTED_INDEXED_COLLECTION_TYPES = {
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    "Float32Array",
    "Float64Array",
};

const std::vector<std::string> SUPPORTED_STRUCTURED_DATA_TYPES = {
    "ArrayBuffer",
    "SharedArrayBuffer",
    "DataView",
    "Atomics",
    "JSON",
};

const std::vector<std::string> SUPPORTED_MANAGING_MEMORY_TYPES = {
    "WeakRef",
    "FinalizationRegistry",
};

const std::vector<std::string> SUPPORTED_ABSTRACTION_OBJECT_TYPES = {
    "Iterator",
    "AsyncIterator",
    "Promise",
    "GeneratorFunction",
    "AsyncGeneratorFunction",
    "Generator",
    "AsyncGenerator",
    "AsyncFunction",
};

const std::vector<std::string> SUPPORTED_REFLECTION_TYPES = {
    "Reflect",
    "Proxy",
};

class JSISerializer {
 public:
  explicit JSISerializer(jsi::Runtime &rt)
      : rt_(rt),
        visitedNodes_(rt_.global()
                          .getPropertyAsFunction(rt_, "Set")
                          .callAsConstructor(rt_)
                          .asObject(rt_)) {}

  std::string stringifyJSIValueRecursively(
      const jsi::Value &value,
      bool topLevel = false);

 private:
  std::string baseStringify(const jsi::Object &object);
  std::string stringifyJSIArray(const jsi::Array &arr);
  std::string stringifyJSIFunction(const jsi::Function &func);
  std::string stringifyJSIHostObject(jsi::HostObject &hostObject);
  std::string stringifyJSIObject(const jsi::Object &object);
  std::string stringifyJSError(const jsi::Object &object);
  std::string stringifyJSSet(const jsi::Object &object, bool weak = false);
  std::string stringifyJSMap(const jsi::Object &object, bool weak = false);
  std::string stringifyDate(const jsi::Object &object);
  std::string stringifyRegExp(const jsi::Object &object);
  std::string stringifyRecursiveType(const jsi::Object &object);

  bool wasVisited(const jsi::Object &object) {
    return visitedNodes_.getPropertyAsFunction(rt_, "has")
        .callWithThis(rt_, visitedNodes_, object)
        .getBool();
  }

  void visit(const jsi::Object &object) {
    visitedNodes_.getPropertyAsFunction(rt_, "add")
        .callWithThis(rt_, visitedNodes_, object);
  }

  jsi::Runtime &rt_;
  jsi::Object visitedNodes_;
};
} // namespace

std::string stringifyJSIValue(jsi::Runtime &rt, const jsi::Value &value);
