#pragma once

#include <jsi/jsi.h>
#include <string>

using namespace facebook;

namespace {
class JSISerializer {
 public:
  explicit JSISerializer(jsi::Runtime &rt)
      : rt_(rt),
        visitedNodes_(rt.global()
                          .getPropertyAsFunction(rt, "Set")
                          .callAsConstructor(rt)
                          .asObject(rt)) {}

  std::string stringifyJSIValueRecursively(
      jsi::Runtime &rt,
      const jsi::Value &value,
      bool topLevel = false);

 private:
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
