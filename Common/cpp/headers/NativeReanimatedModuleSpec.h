#ifndef REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H
#define REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H

#include <memory>
#include <string>

#ifdef ONANDROID
  #include "TurboModule.h"
#else
  #include <ReactCommon/TurboModule.h>
#endif

#include <ReactCommon/JSCallInvoker.h>

namespace facebook {
namespace react {

class JSI_EXPORT NativeReanimatedModuleSpec : public TurboModule {
 protected:
  NativeReanimatedModuleSpec(std::shared_ptr<JSCallInvoker> jsInvoker);

 public:
  virtual void call(jsi::Runtime &rt, const jsi::Function &callback) = 0;

  // worklets

  virtual void registerWorklet(jsi::Runtime &rt, double id, const jsi::String &globalName) = 0;
  virtual void unregisterWorklet(jsi::Runtime &rt, double id) = 0;

  // SharedValue

  virtual void registerSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) = 0;
  virtual void unregisterSharedValue(jsi::Runtime &rt, double id) = 0;
  virtual jsi::Value getSharedValueAsync(jsi::Runtime &rt, double id) = 0;
  virtual void setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) = 0;

};

} // namespace react
} // namespace facebook

#endif //REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H
