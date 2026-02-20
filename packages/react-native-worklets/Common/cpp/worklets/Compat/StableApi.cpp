#include <jsi/jsi.h>
#include <worklets/Compat/Holders.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/Tools/JSISerializer.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include "worklets/SharedItems/Synchronizable.h"

namespace worklets {

std::string JSIValueToString(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value) {
  return worklets::stringifyJSIValue(rt, value);
}

void scheduleOnUI(const std::shared_ptr<UISchedulerHolder> &uiSchedulerHolder, const std::function<void()> &job) {
  // NOLINTNEXTLINE//(performance-no-int-to-ptr)
  auto &uiScheduler = *reinterpret_cast<std::shared_ptr<UIScheduler> *>(uiSchedulerHolder->sharedPtr_);
  uiScheduler->scheduleOnUI(job);
}

facebook::jsi::Runtime *getRuntimeAddressFromHolder(const std::shared_ptr<WorkletRuntimeHolder> &holder) {
  // NOLINTNEXTLINE//(performance-no-int-to-ptr)
  return &(reinterpret_cast<std::weak_ptr<WorkletRuntime> *>(holder->sharedPtr_)->lock()->getJSIRuntime());
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
    case Serializable::ValueType::SymbolType:
      throw std::runtime_error("[Worklets] Not implemented.");
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
    case Serializable::ValueType::ShareableType:
      throw std::runtime_error("[Worklets] Not implemented.");
      break;
  }
}

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet) {
  // NOLINTNEXTLINE//(performance-no-int-to-ptr)
  auto &workletRuntime = *reinterpret_cast<std::shared_ptr<WorkletRuntime> *>(runtimeHolder->sharedPtr_);
  workletRuntime->runSync(std::static_pointer_cast<SerializableWorklet>(worklet));
}

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0) {
  // NOLINTNEXTLINE//(performance-no-int-to-ptr)
  auto &workletRuntime = *reinterpret_cast<std::shared_ptr<WorkletRuntime> *>(runtimeHolder->sharedPtr_);
  workletRuntime->runSync(std::static_pointer_cast<SerializableWorklet>(worklet), arg0);
}

extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntimeHolder> &runtimeHolder,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0,
    const facebook::jsi::Value &arg1) {
  // NOLINTNEXTLINE//(performance-no-int-to-ptr)
  auto &workletRuntime = *reinterpret_cast<std::shared_ptr<WorkletRuntime> *>(runtimeHolder->sharedPtr_);
  workletRuntime->runSync(std::static_pointer_cast<SerializableWorklet>(worklet), arg0, arg1);
}

WorkletRuntimeHolder::~WorkletRuntimeHolder() {
  auto workletRuntimeSharedPtr =
      reinterpret_cast<std::shared_ptr<WorkletRuntime> *>(sharedPtr_); // NOLINT//(performance-no-int-to-ptr)
  delete workletRuntimeSharedPtr; //NOLINT//(cppcoreguidelines-owning-memory)
}

UISchedulerHolder::~UISchedulerHolder() {
  auto uiSchedulerSharedPtr =
      reinterpret_cast<std::shared_ptr<UIScheduler> *>(sharedPtr_); // NOLINT//(performance-no-int-to-ptr)
  delete uiSchedulerSharedPtr; //NOLINT//(cppcoreguidelines-owning-memory)
}

std::shared_ptr<WorkletRuntimeHolder> getWorkletRuntimeHolderFromNativeStateObject(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object) {
  return object.getNativeState<NativeStateWorkletRuntimeHolder>(rt)->holder_;
}

std::shared_ptr<UISchedulerHolder> getUISchedulerHolderFromNativeStateObject(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object) {
  return object.getNativeState<NativeStateUISchedulerHolder>(rt)->holder_;
}

} // namespace worklets
