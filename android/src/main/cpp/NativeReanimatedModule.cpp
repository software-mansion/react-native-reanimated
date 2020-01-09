#include "NativeReanimatedModule.h"

using namespace facebook;

namespace facebook {
namespace react {

NativeReanimatedModule::NativeReanimatedModule()
    : NativeReanimatedModuleSpec() {}

jsi::String NativeReanimatedModule::getString(
    jsi::Runtime &rt,
    const jsi::String &arg) {
    auto res = "natywny string :) " + arg.utf8(rt);
  //return jsi::String::createFromUtf8(rt, arg.utf8(rt));
  return jsi::String::createFromAscii(rt, res);
}

}
}