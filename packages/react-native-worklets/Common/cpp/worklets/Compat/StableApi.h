#pragma once

#define WORKLETS_STABLE_API_VERSION "Deprecated. Use WORKLETS_STABLE_API_TARGET to opt into per-function version checks"

#include <cstdint>
#include <functional>
#include <memory>
#include <string>

#ifdef WORKLETS_STABLE_API_TARGET
#include <array>
#include <cstddef>
#include <string_view>

#define WORKLETS_STABLE_API_SINCE(version) \
  _Pragma("clang diagnostic push") _Pragma("clang diagnostic ignored \"-Wgcc-compat\"") __attribute__(( \
      diagnose_if( \
          ::worklets::detail::parseStableApiVersion(version).front().empty(), \
          "The Worklets C++ function version must be a SemVer string in major.minor.patch form.", \
          "error"), \
      diagnose_if( \
          ::worklets::detail::compareStableApiVersions(WORKLETS_STABLE_API_TARGET, version) < 0, \
          "This function requires Worklets C++ API " version " or newer. " \
          "Choose a compatible function or update WORKLETS_STABLE_API_TARGET after migrating.", \
          "error"))) _Pragma("clang diagnostic pop")

namespace worklets::detail {

constexpr std::array<std::string_view, 3> parseStableApiVersion(std::string_view version) {
  std::array<std::string_view, 3> components{};
  for (std::size_t i = 0; i < components.size(); ++i) {
    const auto separator = version.find('.');
    const bool lastComponent = i + 1 == components.size();
    if (lastComponent != (separator == std::string_view::npos)) {
      return {};
    }
    const auto component = version.substr(0, separator);
    if (component.empty() || (component.size() > 1 && component.front() == '0') ||
        component.find_first_not_of("0123456789") != std::string_view::npos) {
      return {};
    }
    components[i] = component;
    if (separator != std::string_view::npos) {
      version.remove_prefix(separator + 1);
    }
  }
  return components;
}

constexpr int compareStableApiVersions(std::string_view lhs, std::string_view rhs) {
  const auto left = parseStableApiVersion(lhs);
  const auto right = parseStableApiVersion(rhs);
  for (std::size_t i = 0; i < left.size(); ++i) {
    if (left[i].size() != right[i].size()) {
      return left[i].size() < right[i].size() ? -1 : 1;
    }
    if (const auto ordering = left[i].compare(right[i]); ordering != 0) {
      return ordering;
    }
  }
  return 0;
}

static_assert(
    !parseStableApiVersion(WORKLETS_STABLE_API_TARGET).front().empty(),
    "The Worklets C++ target must be a SemVer string in major.minor.patch form.");

} // namespace worklets::detail
#else
#define WORKLETS_STABLE_API_SINCE(version)
#endif

namespace facebook::jsi {
class Runtime;
class Value;
class Object;
class Function;
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
    HandleType, /* removed */
    HostObjectType,
    HostFunctionType,
    ArrayBufferType,
    TurboModuleLikeType,
    ImportType,
    SynchronizableType,
    CustomType,
    SymbolType, /* unused */
    ShareableType,
    ErrorType,
    RegExpType,
  };

  explicit Serializable(ValueType valueType) : valueType_(valueType) {}

  inline ValueType valueType() const {
    return valueType_;
  }

  static std::shared_ptr<Serializable> undefined();

 protected:
  ValueType valueType_;
};

WORKLETS_STABLE_API_SINCE("0.14.0")
extern std::shared_ptr<WorkletRuntime> getWorkletRuntimeFromHolder(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern std::shared_ptr<UIScheduler> getUISchedulerFromHolder(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern facebook::jsi::Runtime &getJSIRuntimeFromWorkletRuntime(const std::shared_ptr<WorkletRuntime> &workletRuntime);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern std::weak_ptr<WorkletRuntime> getWeakRuntimeFromJSIRuntime(facebook::jsi::Runtime &rt);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern void scheduleOnUI(const std::shared_ptr<UIScheduler> &uiScheduler, const std::function<void()> &job);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern bool isOnUIThread(const std::shared_ptr<UIScheduler> &uiScheduler);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern std::string JSIValueToStdString(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern std::shared_ptr<Serializable>
extractSerializable(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value, const std::string &errorMessage);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern std::shared_ptr<Serializable> extractSerializable(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &value,
    const std::string &errorMessage,
    const Serializable::ValueType expectedType);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const std::shared_ptr<Serializable> &worklet,
    const facebook::jsi::Value &arg0,
    const facebook::jsi::Value &arg1);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const facebook::jsi::Function &worklet);

WORKLETS_STABLE_API_SINCE("0.14.0")
extern void runSyncOnRuntime(
    const std::shared_ptr<WorkletRuntime> &workletRuntime,
    const facebook::jsi::Function &worklet,
    const facebook::jsi::Value &arg0);

using RequestAnimationFrameHostFunction =
    std::function<void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)>;

WORKLETS_STABLE_API_SINCE("0.14.0")
extern void installRequestAnimationFrame(
    facebook::jsi::Runtime &uiRuntime,
    const RequestAnimationFrameHostFunction &requestAnimationFrame);

} // namespace worklets
