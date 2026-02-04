#pragma once

#include <jsi/jsi.h>

#include <memory>

using namespace facebook;

namespace worklets {

class Serializable {
 public:
  virtual jsi::Value toJSValue(jsi::Runtime &rt) = 0;

  virtual ~Serializable() = default;

  enum class ValueType : std::uint8_t {
    UndefinedType,
    NullType,
    BooleanType,
    NumberType,
    // SymbolType, TODO
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
