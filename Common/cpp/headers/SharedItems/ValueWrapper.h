#pragma once

#include "WorkletsCache.h"
#include "SharedParent.h"
#include <jsi/jsi.h>
#include <JSIStoreValueUser.h>
#include <string>
#include "HostFunctionHandler.h"

namespace reanimated {

enum WrapperValueTypes {
  BOOLEAN,
  NUMBER,
  STRING,
  HOST_FUNCTION,
  FROZEN_OBJECT,
  REMOTE_OBJECT,
  FROZEN_ARRAY,
  MUTABLE_VALUE,
};

class HostFunctionWrapper;

class ValueWrapper {
public:
  ValueWrapper() {};
  ValueWrapper(WrapperValueTypes _type) : type(_type) {};
  WrapperValueTypes getType() const {
    return type;
  }
  
  static bool asBoolean(const std::unique_ptr<ValueWrapper>& valueContainer);
  static double asNumber(const std::unique_ptr<ValueWrapper>& valueContainer);
  static const std::string asString(const std::unique_ptr<ValueWrapper>& valueContainer);
  static const std::shared_ptr<HostFunctionHandler> asHostFunction(const std::unique_ptr<ValueWrapper>& valueContainer);
  static const std::shared_ptr<FrozenObject> asFrozenObject(const std::unique_ptr<ValueWrapper>& valueContainer);
  static const std::shared_ptr<RemoteObject> asRemoteObject(const std::unique_ptr<ValueWrapper>& valueContainer);
  static const std::vector<std::shared_ptr<ShareableValue>> asFrozenArray(const std::unique_ptr<ValueWrapper>& valueContainer);
  static const std::shared_ptr<MutableValue> asMutableValue(const std::unique_ptr<ValueWrapper>& valueContainer);
  
  static const HostFunctionWrapper* asHostFunctionWrapper(const std::unique_ptr<ValueWrapper>& valueContainer);
  
protected:
  WrapperValueTypes type;
};

class BooleanValueWrapper : public ValueWrapper {
public:
  BooleanValueWrapper(const bool _value)
    : value(_value), ValueWrapper(WrapperValueTypes::BOOLEAN) {};
  bool value;
};

class NumberValueWrapper : public ValueWrapper {
public:
  NumberValueWrapper(const double _value)
    : value(_value), ValueWrapper(WrapperValueTypes::NUMBER) {};
  double value;
};

class StringValueWrapper : public ValueWrapper {
public:
  StringValueWrapper(const std::string & _value)
    : value(_value), ValueWrapper(WrapperValueTypes::STRING) {};
  std::string value;
};

class HostFunctionWrapper : public ValueWrapper {
public:
  HostFunctionWrapper(const std::shared_ptr<HostFunctionHandler> & _value)
    : value(_value), ValueWrapper(WrapperValueTypes::HOST_FUNCTION) {};
  HostFunctionWrapper(
    const std::shared_ptr<HostFunctionHandler> & _value,
    jsi::Runtime *_hostRuntime
  )
    : value(_value),
      hostRuntime(_hostRuntime),
      ValueWrapper(WrapperValueTypes::HOST_FUNCTION) {};
  std::shared_ptr<HostFunctionHandler> value;
  jsi::Runtime *hostRuntime;
};

class FrozenObjectWrapper : public ValueWrapper {
public:
  FrozenObjectWrapper(const std::shared_ptr<FrozenObject> & _value)
    : value(_value), ValueWrapper(WrapperValueTypes::FROZEN_OBJECT) {};
  std::shared_ptr<FrozenObject> value;
};

class RemoteObjectWrapper : public ValueWrapper {
public:
  RemoteObjectWrapper(const std::shared_ptr<RemoteObject> & _value)
    : value(_value), ValueWrapper(WrapperValueTypes::REMOTE_OBJECT) {};
  std::shared_ptr<RemoteObject> value;
};

class FrozenArrayWrapper : public ValueWrapper {
public:
  FrozenArrayWrapper(const std::vector<std::shared_ptr<ShareableValue>> & _value)
    : value(_value), ValueWrapper(WrapperValueTypes::FROZEN_ARRAY) {};
  std::vector<std::shared_ptr<ShareableValue>> value;
};

class MutableValueWrapper : public ValueWrapper {
public:
  MutableValueWrapper(const std::shared_ptr<MutableValue> & _value)
    : value(_value), ValueWrapper(WrapperValueTypes::MUTABLE_VALUE) {};
  std::shared_ptr<MutableValue> value;
};

}
