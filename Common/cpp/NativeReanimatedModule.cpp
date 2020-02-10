#include "NativeReanimatedModule.h"
#include <memory>

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

  jsi::WeakObject * fun = new jsi::WeakObject(rt, callback);
  std::shared_ptr<jsi::WeakObject> sharedFunction(fun);

  scheduler->scheduleOnUI([&rt, sharedFunction, this] () mutable {
     __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "resultt OK");
     scheduler->scheduleOnJS([&rt, sharedFunction] () mutable {
        __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "resultt2 OK");
        jsi::Value val = sharedFunction->lock(rt);
        jsi::Function cb = val.asObject(rt).asFunction(rt);
        cb.call(rt,  jsi::String::createFromUtf8(rt, "natywny string dla callback-a"));
     });
  });
  /*scheduler->scheduleOnJS([] () mutable {
    __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "resultt2 OK");
  });
  callback.call(rt,  jsi::String::createFromUtf8(rt, "natywny string dla callback-a"));*/
}

}
}
