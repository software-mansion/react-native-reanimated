#pragma once

#include <jsi/jsi.h>
#include <string>

using namespace facebook;

namespace {
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
  std::string stringifyJSIArray(const jsi::Array &arr);
  std::string stringifyJSIArrayBuffer(const jsi::ArrayBuffer &buf);
  std::string stringifyJSIFunction(const jsi::Function &func);
  std::string stringifyJSIHostObject(jsi::HostObject &hostObject);
  std::string stringifyJSIObject(const jsi::Object &object);
  std::string stringifyJSError(const jsi::Object &object);
  std::string stringifyJSSet(const jsi::Object &object);
  std::string stringifyJSMap(const jsi::Object &object);

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
