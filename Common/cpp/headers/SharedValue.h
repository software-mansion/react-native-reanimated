//
// Created by Szymon Kapala on 2020-02-11.
//

#ifndef REANIMATEDEXAMPLE_SHAREDVALUE_H
#define REANIMATEDEXAMPLE_SHAREDVALUE_H

#include <memory>
#include <unordered_map>
#include <jsi/jsi.h>

using namespace facebook;

class SharedValue {
  public:
    bool dirty = false;
    jsi::Value asValue(jsi::Runtime &rt) const = 0;
    jsi::Object asParameter(jsi::Runtime &rt) = 0;
    void setNewValue(SharedValue sv) = 0;
    virtual ~SharedValue(){};
};



#endif //REANIMATEDEXAMPLE_SHAREDVALUE_H
