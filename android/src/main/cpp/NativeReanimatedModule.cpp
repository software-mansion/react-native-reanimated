#include "NativeReanimatedModule.h"
#include "NativeProxy.h"
#include <thread>

#define APPNAME "NATIVE_REANIMATED"

using namespace facebook;

namespace facebook {
namespace react {

std::string fun = "";

NativeReanimatedModule::NativeReanimatedModule() : NativeReanimatedModuleSpec() {}

NativeReanimatedModule::NativeReanimatedModule(ALooper *looper) : NativeReanimatedModuleSpec() {
  this->looper = looper;
}

jsi::String NativeReanimatedModule::getString(
  jsi::Runtime &rt,
  const jsi::String &arg) {

  auto res = "natywny string :) " + arg.utf8(rt);
  //return jsi::String::createFromUtf8(rt, arg.utf8(rt));

  auto functionImpl = arg.utf8(rt);
  //fun = &(rt.global().getPropertyAsFunction(rt, functionName.c_str()).getHostFunction(rt));
//  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "impl2 %s", fun.c_str());
  return jsi::String::createFromAscii(rt, res);
}

void NativeReanimatedModule::call(
  jsi::Runtime &rt,
  const jsi::Function &callback) {
  callback.call(rt,  jsi::String::createFromUtf8(rt, "natywny string dla callback-a"));
}

}
}