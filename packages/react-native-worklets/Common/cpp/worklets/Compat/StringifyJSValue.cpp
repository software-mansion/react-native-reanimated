#include <jsi/jsi.h>
#include <worklets/Tools/JSISerializer.h>

std::string workletsStringifyJSIValue(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value) {
  return worklets::stringifyJSIValue(rt, value);
}
