#ifndef REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H
#define REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H

#include <memory>
#include <string>
#include <vector>

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

  virtual void registerWorklet(jsi::Runtime &rt, double id, std::string functionAsString) = 0;
  virtual void unregisterWorklet(jsi::Runtime &rt, double id) = 0;
  virtual void addWorkletListener(jsi::Runtime &rt, std::string message, const jsi::Function &callback) = 0;

  // SharedValue

  virtual void registerSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) = 0;
  virtual void unregisterSharedValue(jsi::Runtime &rt, double id) = 0;
  virtual void getSharedValueAsync(jsi::Runtime &rt, double id, const jsi::Function &callback) = 0;
  virtual void setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) = 0;


  // Appliers
  virtual void registerApplierOnRender(jsi::Runtime &rt, int id, int workletId, std::vector<int> svIds) = 0;
  virtual void unregisterApplierFromRender(jsi::Runtime &rt, int id) = 0;
  virtual void registerApplierOnEvent(jsi::Runtime &rt, int id, std::string eventName, int workletId, std::vector<int> svIds) = 0;
  virtual void unregisterApplierFromEvent(jsi::Runtime &rt, int id) = 0;
};

} // namespace react
} // namespace facebook

#endif //REANIMATEDEXAMPLE_NATIVEREANIMATEDMODULESPEC_H
