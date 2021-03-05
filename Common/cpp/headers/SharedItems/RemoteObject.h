#pragma once

#include "SharedParent.h"
#include "FrozenObject.h"
#include "JSIStoreValueUser.h"

using namespace facebook;

namespace reanimated {

class RemoteObject: public jsi::HostObject, public StoreUser {
private:
  NativeReanimatedModule *module;
  std::weak_ptr<jsi::Value> backing;
  std::unique_ptr<FrozenObject> initializer;
public:
  void maybeInitializeOnUIRuntime(jsi::Runtime &rt);
  RemoteObject(jsi::Runtime &rt, jsi::Object &object, std::shared_ptr<ErrorHandler> errorHandler, std::shared_ptr<Scheduler> uiScheduler, std::shared_ptr<ShareableValue> valueSetter):
     StoreUser(uiScheduler), initializer(new FrozenObject(rt, object, errorHandler, uiScheduler, valueSetter)) {}
  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt);
};

}
