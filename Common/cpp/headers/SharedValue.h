//
// Created by Szymon Kapala on 2020-02-11.
//

#ifndef REANIMATEDEXAMPLE_SHAREDVALUE_H
#define REANIMATEDEXAMPLE_SHAREDVALUE_H

#include <memory>
#include <unordered_map>
#include <jsi/jsi.h>

using namespace facebook;

enum class SharedValueType {
  shared_double,
  shared_string,
  shared_boolean,
  shared_object,
  shared_function,
  shared_array,
  shared_starter,
};

class SharedValue {
  public:
    SharedValueType type;
    bool shouldBeSentToJava = true;
    bool dirty = false;
    virtual jsi::Value asValue(jsi::Runtime &rt) const = 0;
    virtual jsi::Value asParameter(jsi::Runtime &rt) = 0;
    virtual void setNewValue(std::shared_ptr<SharedValue> sv) = 0;
    virtual void willUnregister(){}
    virtual ~SharedValue(){};
};



#endif //REANIMATEDEXAMPLE_SHAREDVALUE_H
