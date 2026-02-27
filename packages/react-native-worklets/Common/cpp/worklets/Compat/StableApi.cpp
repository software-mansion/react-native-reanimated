#include <jsi/jsi.h>
#include <worklets/Compat/Holders.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/Synchronizable.h>
#include <worklets/Tools/JSISerializer.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {

std::string JSIValueToString(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value) {
  return worklets::stringifyJSIValue(rt, value);
}

void scheduleOnUI(const std::shared_ptr<UIScheduler> &uiScheduler, const std::function<void()> &job) {
  uiScheduler->scheduleOnUI(job);
}

facebook::jsi::Runtime *getJSIRuntimeFromWorkletRuntime(const std::shared_ptr<WorkletRuntime> &workletRuntime) {
  return &(workletRuntime->getJSIRuntime());
}

std::shared_ptr<Serializable>
extractSerializable(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value, const std::string &errorMessage) {
  return extractSerializableOrThrow(rt, value, errorMessage);
}

std::shared_ptr<Serializable> extractSerializable(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &value,
    const std::string &errorMessage,
    const Serializable::ValueType expectedType) {
  switch (expectedType) {
    case Serializable::ValueType::WorkletType:
      return extractSerializableOrThrow<SerializableWorklet>(rt, value, errorMessage);
    case Serializable::ValueType::UndefinedType:
      return extractSerializableOrThrow<SerializableScalar>(rt, value, errorMessage);
    case Serializable::ValueType::NullType:
      return extractSerializableOrThrow<SerializableScalar>(rt, value, errorMessage);
    case Serializable::ValueType::BooleanType:
      return extractSerializableOrThrow<SerializableScalar>(rt, value, errorMessage);
    case Serializable::ValueType::NumberType:
      return extractSerializableOrThrow<SerializableScalar>(rt, value, errorMessage);
    case Serializable::ValueType::BigIntType:
      return extractSerializableOrThrow<SerializableBigInt>(rt, value, errorMessage);
    case Serializable::ValueType::StringType:
      return extractSerializableOrThrow<SerializableString>(rt, value, errorMessage);
    case Serializable::ValueType::ObjectType:
      return extractSerializableOrThrow<SerializableObject>(rt, value, errorMessage);
    case Serializable::ValueType::ArrayType:
      return extractSerializableOrThrow<SerializableArray>(rt, value, errorMessage);
    case Serializable::ValueType::MapType:
      return extractSerializableOrThrow<SerializableMap>(rt, value, errorMessage);
    case Serializable::ValueType::SetType:
      return extractSerializableOrThrow<SerializableSet>(rt, value, errorMessage);
    case Serializable::ValueType::RemoteFunctionType:
      return extractSerializableOrThrow<SerializableRemoteFunction>(rt, value, errorMessage);
    case Serializable::ValueType::HandleType:
      return extractSerializableOrThrow<SerializableInitializer>(rt, value, errorMessage);
    case Serializable::ValueType::HostObjectType:
      return extractSerializableOrThrow<SerializableHostObject>(rt, value, errorMessage);
    case Serializable::ValueType::HostFunctionType:
      return extractSerializableOrThrow<SerializableHostFunction>(rt, value, errorMessage);
    case Serializable::ValueType::ArrayBufferType:
      return extractSerializableOrThrow<SerializableArrayBuffer>(rt, value, errorMessage);
    case Serializable::ValueType::TurboModuleLikeType:
      return extractSerializableOrThrow<SerializableTurboModuleLike>(rt, value, errorMessage);
    case Serializable::ValueType::ImportType:
      return extractSerializableOrThrow<SerializableImport>(rt, value, errorMessage);
    case Serializable::ValueType::SynchronizableType:
      return extractSerializableOrThrow<Synchronizable>(rt, value, errorMessage);
    case Serializable::ValueType::CustomType:
      return extractSerializableOrThrow<CustomSerializable>(rt, value, errorMessage);
    case Serializable::ValueType::SymbolType:
      throw std::runtime_error("[Worklets] Not implemented.");
    case Serializable::ValueType::ShareableType:
      throw std::runtime_error("[Worklets] Not implemented.");
      break;
  }
}

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet) {
  workletRuntime->runSync(std::static_pointer_cast<SerializableWorklet>(worklet));
}

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0) {
  workletRuntime->runSync(std::static_pointer_cast<SerializableWorklet>(worklet), arg0);
}

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0,
    const facebook::jsi::Value &arg1) {
  workletRuntime->runSync(std::static_pointer_cast<SerializableWorklet>(worklet), arg0, arg1);
}

std::shared_ptr<WorkletRuntime> getWorkletRuntimeFromHolder(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object) {
  return object.getNativeState<WorkletRuntimeHolder>(rt)->runtime_;
}

std::shared_ptr<UIScheduler> getUISchedulerFromHolder(facebook::jsi::Runtime &rt, const facebook::jsi::Object &object) {
  return object.getNativeState<UISchedulerHolder>(rt)->scheduler_;
}

} // namespace worklets
