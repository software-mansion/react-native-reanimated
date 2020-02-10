#include "NativeReanimatedModule.h"
#include <thread>

#define APPNAME "NATIVE_REANIMATED"

using namespace facebook;

namespace facebook {
namespace react {

std::string fun = "";


#include <android/log.h>
#define APPNAME "NATIVE_REANIMATED"

NativeReanimatedModule::NativeReanimatedModule(std::shared_ptr<Scheduler> scheduler, std::shared_ptr<JSCallInvoker> jsInvoker) : NativeReanimatedModuleSpec(jsInvoker) {
  this->scheduler = scheduler;
}

jsi::String NativeReanimatedModule::getString(
  jsi::Runtime &rt,
  const jsi::String &arg) {
  return jsi::String::createFromAscii(rt, arg.utf8(rt));
}

void NativeReanimatedModule::call(
  jsi::Runtime &rt,
  const jsi::Function &callback) {

  scheduler->scheduleOnUI([&rt, callback] () mutable {
     __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "resultt OK");
     scheduler->scheduleOnJS([&rt, callback] () mutable {
        callback.call(rt,  jsi::String::createFromUtf8(rt, "natywny string dla callback-a"));
     }
  });

}

}
}
