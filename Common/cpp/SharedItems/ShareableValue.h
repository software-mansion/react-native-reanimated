#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>
#include "AnimatedSensorModule.h"
#include "HostFunctionHandler.h"
#include "JSIStoreValueUser.h"
#include "LayoutAnimationsProxy.h"
#include "RuntimeManager.h"
#include "Scheduler.h"
#include "SharedParent.h"
#include "ValueWrapper.h"
#include "WorkletsCache.h"

using namespace facebook;

namespace reanimated {

class ShareableValue : public std::enable_shared_from_this<ShareableValue>,
                       public StoreUser {
  friend WorkletsCache;
  friend FrozenObject;
  friend LayoutAnimationsProxy;
  friend NativeReanimatedModule;
  friend AnimatedSensorModule;
  friend void extractMutables(
      jsi::Runtime &rt,
      std::shared_ptr<ShareableValue> sv,
      std::vector<std::shared_ptr<MutableValue>> &res);

 private:
  RuntimeManager *runtimeManager;
  std::unique_ptr<ValueWrapper> valueContainer;

  jsi::Value toJSValue(jsi::Runtime &rt);
  jsi::Object createHost(
      jsi::Runtime &rt,
      std::shared_ptr<jsi::HostObject> host);
  void adapt(jsi::Runtime &rt, const jsi::Value &value, ValueType objectType);
  std::string demangleExceptionName(std::string toDemangle);

 public:
                         ShareableValue(RuntimeManager *runtimeManager, std::shared_ptr<Scheduler> s);
                         ~ShareableValue();
  ValueType type = ValueType::UndefinedType;
  static std::shared_ptr<ShareableValue> adapt(
      jsi::Runtime &rt,
      const jsi::Value &value,
      RuntimeManager *runtimeManager,
      ValueType objectType = ValueType::UndefinedType);
  static jsi::Value makeShareableHostObjectClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      RuntimeManager *runtimeManager);
  jsi::Value getValue(jsi::Runtime &rt);
};

} // namespace reanimated
