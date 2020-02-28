//
// 
//

#ifndef REANIMATEDEXAMPLE_SHAREDBOOLEAN_H
#define REANIMATEDEXAMPLE_SHAREDBOOLEAN_H

#include "SharedValue.h"

class SharedBoolean : public SharedValue {
  public:
    bool value;
    int id;
    SharedBoolean(int id, bool value);
    jsi::Value asValue(jsi::Runtime &rt) const override;
    jsi::Object asParameter(jsi::Runtime &rt) override;
    void setNewValue(std::shared_ptr<SharedValue> sv) override;
    ~SharedBoolean();
};

#endif //REANIMATEDEXAMPLE_SHAREDBOOLEAN_H
