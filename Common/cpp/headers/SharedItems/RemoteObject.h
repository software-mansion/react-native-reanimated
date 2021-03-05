#pragma once

#include "SharedParent.h"
#include "FrozenObject.h"
#include "JSIStoreValueUser.h"
#include "RuntimeManager.h"

using namespace facebook;

namespace reanimated {

class RemoteObject: public jsi::HostObject, public StoreUser {
private:
  RuntimeManager *runtimeManager;
  std::weak_ptr<jsi::Value> backing;
  std::unique_ptr<FrozenObject> initializer;
public:
  void maybeInitializeOnUIRuntime(jsi::Runtime &rt);
  RemoteObject(jsi::Runtime &rt, jsi::Object &object, RuntimeManager *runtimeManager, std::shared_ptr<Scheduler> s):
     StoreUser(s), runtimeManager(runtimeManager), initializer(new FrozenObject(rt, object, runtimeManager)) {}
  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt);
};

}
