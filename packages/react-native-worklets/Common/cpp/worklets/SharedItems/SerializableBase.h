#pragma once

#include <memory>

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
    SymbolType,
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
  };

  explicit Serializable(ValueType valueType) : valueType_(valueType) {}

  inline ValueType valueType() const {
    return valueType_;
  }

  static std::shared_ptr<Serializable> undefined();

 protected:
  ValueType valueType_;
};

} // namespace worklets
