#pragma once

#include <string>
#include <mutex>
#include <unordered_map>
#include <jsi/jsi.h>
#include "Logger.h"
#include "WorkletsCache.h"

namespace reanimated {

using namespace facebook;

class NativeReanimatedModule;

enum ValueType {
  UndefinedType,
  NullType,
  BoolType,
  NumberType,
  StringType,
  ObjectType, /* frozen object, can only be set and never modified */
  ArrayType, /* frozen array, can only be set and never modified */
  RemoteObjectType, /* object that can be instantiated on host side and modified on the remote (worklet) side */
  MutableValueType, /* object with 'value' property that can be updated and read from any thread */
  HostFunctionType, /* function that will be executed asynchronously on the host runtime */
  WorkletFunctionType, /* function that gets run on the UI thread */
};

class FrozenObject;
class MutableValue;
class RemoteObject;
class RemoteObjectInitializer;

class ShareableValue: public std::enable_shared_from_this<ShareableValue> {
friend WorkletsCache;
friend void extractMutables(jsi::Runtime &rt,
                            std::shared_ptr<ShareableValue> sv,
                            std::vector<std::shared_ptr<MutableValue>> &res);
friend jsi::Value createFrozenWrapper(ShareableValue *sv,
                                      jsi::Runtime &rt,
                                      std::shared_ptr<FrozenObject> frozenObject);
private:
  NativeReanimatedModule *module;
  bool boolValue;
  double numberValue;
  std::string stringValue;
  std::shared_ptr<jsi::Function> hostFunction;
  jsi::Runtime *hostRuntime;
  std::shared_ptr<FrozenObject> frozenObject;
  std::shared_ptr<RemoteObjectInitializer> remoteObjectInitializer;
  std::shared_ptr<RemoteObject> remoteObject;
  std::vector<std::shared_ptr<ShareableValue>> frozenArray;

  std::unique_ptr<jsi::Value> hostValue;
  std::unique_ptr<jsi::Value> remoteValue;

  jsi::Value toJSValue(jsi::Runtime &rt);

  jsi::Object createHost(jsi::Runtime &rt, std::shared_ptr<jsi::HostObject> host);

  ShareableValue(NativeReanimatedModule *module): module(module) {}
  void adapt(jsi::Runtime &rt, const jsi::Value &value, ValueType objectType);
  void adaptCache(jsi::Runtime &rt, const jsi::Value &value);

public:
  ValueType type = UndefinedType;
  std::shared_ptr<MutableValue> mutableValue;
  static std::shared_ptr<ShareableValue> adapt(jsi::Runtime &rt, const jsi::Value &value, NativeReanimatedModule *module, ValueType objectType = UndefinedType);
  jsi::Value getValue(jsi::Runtime &rt);

};

class MutableValueSetterProxy: public jsi::HostObject {
private:
  friend MutableValue;
  std::shared_ptr<MutableValue> mutableValue;
public:
  MutableValueSetterProxy(std::shared_ptr<MutableValue> mutableValue): mutableValue(std::move(mutableValue)) {}
  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
};

class MutableValue : public jsi::HostObject, public std::enable_shared_from_this<MutableValue> {
  private:
  friend MutableValueSetterProxy;
  NativeReanimatedModule *module;
  std::mutex readWriteMutex;
  std::shared_ptr<ShareableValue> value;
  jsi::Value setter;
  jsi::Value animation;
  std::vector<std::pair<unsigned long, std::function<void()>>> listeners;

  void setValue(jsi::Runtime &rt, const jsi::Value &newValue);
  jsi::Value getValue(jsi::Runtime &rt);

  public:
  MutableValue(jsi::Runtime &rt, const jsi::Value &initial, NativeReanimatedModule *module);

  public:
  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  unsigned long addListener(std::function<void()> listener);
  void removeListener(unsigned long listenerId);
};

class FrozenObject : public jsi::HostObject {
  friend WorkletsCache;
  friend void extractMutables(jsi::Runtime &rt,
                              std::shared_ptr<ShareableValue> sv,
                              std::vector<std::shared_ptr<MutableValue>> &res);
  private:
  std::unordered_map<std::string, std::shared_ptr<ShareableValue>> map;

  public:

  FrozenObject(jsi::Runtime &rt, const jsi::Object &object, NativeReanimatedModule *module);

  // set is not available as the object is "read only" (to avoid locking)

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt);

  std::shared_ptr<jsi::Object> shallowClone(jsi::Runtime &rt);
};

class RemoteObject: public jsi::HostObject {
private:
  NativeReanimatedModule *module;
  std::shared_ptr<jsi::Object> backing;
  std::unique_ptr<FrozenObject> initializer;
public:
  void maybeInitializeOnUIRuntime(jsi::Runtime &rt);
  RemoteObject(jsi::Runtime &rt, jsi::Object &object, NativeReanimatedModule *module):
    module(module), initializer(new FrozenObject(rt, object, module)) {}
  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt);
};

}
