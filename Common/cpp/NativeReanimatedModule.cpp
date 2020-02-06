#include "NativeReanimatedModule.h"
#include <thread>

#define APPNAME "NATIVE_REANIMATED"

using namespace facebook;

namespace facebook {
namespace react {

std::string fun = "";

NativeReanimatedModule::NativeReanimatedModule(std::shared_ptr<JSCallInvoker> jsInvoker) : NativeReanimatedModuleSpec(jsInvoker) {}

jsi::String NativeReanimatedModule::getString(
  jsi::Runtime &rt,
  const jsi::String &arg) {
  return jsi::String::createFromAscii(rt, arg.utf8(rt));
}

void NativeReanimatedModule::call(
  jsi::Runtime &rt,
  const jsi::Function &callback) {
  callback.call(rt,  jsi::String::createFromUtf8(rt, "natywny string dla callback-a"));
}

}
}
