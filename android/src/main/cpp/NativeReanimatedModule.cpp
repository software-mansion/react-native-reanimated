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
  return jsi::String::createFromAscii(rt, arg.utf8(rt));
}

void NativeReanimatedModule::call(
  jsi::Runtime &rt,
  const jsi::Function &callback) {
  callback.call(rt,  jsi::String::createFromUtf8(rt, "natywny string dla callback-a"));
}

}
}