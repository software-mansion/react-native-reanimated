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
  REMOTE_OBJECT_INITIALIZER,
  REMOTE_OBJECT,
  FROZEN_ARRAY
};

class ValueWrapper {
public:
  ValueWrapper() {};
  ValueWrapper(WrapperValueTypes _type) : type(_type) {};
  WrapperValueTypes getType() const {
    return type;
  }
  
  //TODO: maybe add setters also
  static const std::string getString(const std::unique_ptr<ValueWrapper>& valueContainer);
  static const std::shared_ptr<FrozenObject> asFrozenObject(const std::unique_ptr<ValueWrapper>& valueContainer);
  //TODO: consider to implement getters for all of types
  
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
  std::shared_ptr<HostFunctionHandler> value;
};

class FrozenObjectWrapper : public ValueWrapper {
public:
  FrozenObjectWrapper(const std::shared_ptr<FrozenObject> & _value)
    : value(_value), ValueWrapper(WrapperValueTypes::FROZEN_OBJECT) {};
  FrozenObjectWrapper(const std::shared_ptr<FrozenObject> & _value, bool _containsHostFunction)
    : value(_value),
      containsHostFunction(_containsHostFunction),
      ValueWrapper(WrapperValueTypes::FROZEN_OBJECT) {};
  std::shared_ptr<FrozenObject> value;
  bool containsHostFunction = false;
};

class RemoteObjectInitializerWrapper : public ValueWrapper {
public:
  RemoteObjectInitializerWrapper(const std::shared_ptr<RemoteObjectInitializerWrapper> & _value)
    : value(_value), ValueWrapper(WrapperValueTypes::REMOTE_OBJECT_INITIALIZER) {};
  std::shared_ptr<RemoteObjectInitializerWrapper> value;
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

}
