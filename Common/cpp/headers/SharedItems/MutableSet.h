#pragma once

#include "SharedParent.h"
#include "MutableValueSetterProxy.h"
#include <mutex>
#include <jsi/jsi.h>
#include <map>
#include "JSIStoreValueUser.h"
#include <set>

using namespace facebook;

namespace reanimated {

class MutableSet : public jsi::HostObject, public StoreUser {
  private:
  NativeReanimatedModule *module;
  std::mutex readWriteMutex;
  std::set<std::shared_ptr<ShareableValue>> items;
  void init(jsi::Runtime &rt, const jsi::Value &value);

  public:
  MutableSet(jsi::Runtime &rt, const jsi::Value &initial, NativeReanimatedModule *module, std::shared_ptr<Scheduler> s);

  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt);
};

}
