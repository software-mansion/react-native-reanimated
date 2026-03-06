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

class WorkletRuntime;
class UIScheduler;

class Serializable {
 public:
  virtual facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) = 0;

  virtual ~Serializable();

  enum class ValueType : std::uint8_t {
    UndefinedType,
    NullType,
    BooleanType,
    NumberType,
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
    SymbolType, /* unused */
    ShareableType
  };

  explicit Serializable(ValueType valueType) : valueType_(valueType) {}

  inline ValueType valueType() const {
    return valueType_;
  }

  static std::shared_ptr<Serializable> undefined();

 protected:
  ValueType valueType_;
};

extern std::shared_ptr<WorkletRuntime> getWorkletRuntimeFromHolder(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object);

extern std::shared_ptr<UIScheduler> getUISchedulerFromHolder(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object);

extern facebook::jsi::Runtime *getJSIRuntimeFromWorkletRuntime(const std::shared_ptr<WorkletRuntime> &workletRuntime);

extern std::weak_ptr<WorkletRuntime> getWeakRuntimeFromJSIRuntime(facebook::jsi::Runtime &rt);

extern void scheduleOnUI(const std::shared_ptr<UIScheduler> &uiScheduler, const std::function<void()> &job);

extern std::string JSIValueToString(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value);

extern std::shared_ptr<Serializable>
extractSerializable(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value, const std::string &errorMessage);

extern std::shared_ptr<Serializable> extractSerializable(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &value,
    const std::string &errorMessage,
    const Serializable::ValueType expectedType);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0);

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0,
    const facebook::jsi::Value &arg1);

} // namespace worklets
