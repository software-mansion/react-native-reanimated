#pragma once

#include <jsi/jsi.h>
#include <string>

namespace worklets {

class JSISerializer {
 public:
  explicit JSISerializer(facebook::jsi::Runtime &rt);
  std::string stringifyJSIValueRecursively(
      const facebook::jsi::Value &value,
      bool isTopLevel = false);

 private:
  std::string stringifyArray(const facebook::jsi::Array &arr);
  std::string stringifyFunction(const facebook::jsi::Function &func);
  std::string stringifyHostObject(facebook::jsi::HostObject &hostObject);
  std::string stringifyObject(const facebook::jsi::Object &object);
  std::string stringifyError(const facebook::jsi::Object &object);
  std::string stringifySet(const facebook::jsi::Object &object);
  std::string stringifyMap(const facebook::jsi::Object &object);
  std::string stringifyWithName(const facebook::jsi::Object &object);
  std::string stringifyWithToString(const facebook::jsi::Object &object);
  std::string stringifyRecursiveType(const facebook::jsi::Object &object);

  bool hasBeenVisited(const facebook::jsi::Object &object) {
    return visitedNodes_.getPropertyAsFunction(rt_, "has")
        .callWithThis(rt_, visitedNodes_, object)
        .getBool();
  }

  void markAsVisited(const facebook::jsi::Object &object) {
    visitedNodes_.getPropertyAsFunction(rt_, "add")
        .callWithThis(rt_, visitedNodes_, object);
  }

  facebook::jsi::Runtime &rt_;
  facebook::jsi::Object visitedNodes_;
};

std::string stringifyJSIValue(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &value);

} // namespace worklets
