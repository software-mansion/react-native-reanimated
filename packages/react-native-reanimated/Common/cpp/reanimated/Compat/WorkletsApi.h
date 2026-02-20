#pragma once

#include <cstdint>
#include <functional>
#include <memory>
#include <string>

namespace facebook::jsi {
class Runtime;
class Value;
class Object;
} // namespace facebook::jsi

namespace worklets {

class Serializable {
 public:
  virtual facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) = 0;

  virtual ~Serializable();

  enum class ValueType : std::uint8_t {
    UndefinedType,
    NullType,
    BooleanType,
    NumberType,
    SymbolType, // Unused currently
    BigIntType,
    StringType,
    ObjectType,
    ArrayType,
    MapType,
    SetType,
    WorkletType,
    RemoteFunctionType,
    HandleType,
    HostObjectType,
    HostFunctionType,
    ArrayBufferType,
    TurboModuleLikeType,
    ImportType,
    SynchronizableType,
    CustomType,
    ShareableType // Unused currently
  };

  explicit Serializable(ValueType valueType) : valueType_(valueType) {}

  inline ValueType valueType() const {
    return valueType_;
  }

  static std::shared_ptr<Serializable> undefined();

 protected:
  ValueType valueType_;
};

class WorkletRuntimeHolder {
 public:
  explicit WorkletRuntimeHolder(uintptr_t sharedPtr) : sharedPtr_(sharedPtr) {}

  ~WorkletRuntimeHolder();

  uintptr_t sharedPtr_;
};

class UISchedulerHolder {
 public:
  explicit UISchedulerHolder(uintptr_t sharedPtr) : sharedPtr_(sharedPtr) {}

  ~UISchedulerHolder();

  uintptr_t sharedPtr_;
};

extern std::shared_ptr<WorkletRuntimeHolder> getWorkletRuntimeHolderFromNativeStateObject(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object);

extern std::shared_ptr<UISchedulerHolder> getUISchedulerHolderFromNativeStateObject(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object);

extern facebook::jsi::Runtime *getRuntimeAddressFromHolder(const std::shared_ptr<WorkletRuntimeHolder> &holder);

extern void scheduleOnUI(const std::shared_ptr<UISchedulerHolder> &uiSchedulerHolder, const std::function<void()> &job);

// TODO: Remove the use of this function from Reanimated
extern std::string JSIValueToString(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value);

extern std::shared_ptr<Serializable>
extractSerializable(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value, const std::string &errorMessage);

extern std::shared_ptr<Serializable>
extractWorklet(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value, const std::string &errorMessage);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0,
    const facebook::jsi::Value &arg1);

} // namespace worklets
