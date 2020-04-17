//
// Created by Szymon Kapala on 2020-02-14.
//

#ifndef REANIMATEDEXAMPLE_SHAREDSTRING_H
#define REANIMATEDEXAMPLE_SHAREDSTRING_H

#include "SharedValue.h"
#include "SharedValueRegistry.h"

class SharedString : public SharedValue {
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
  public:
    std::string value;
    int id;
    SharedString(int id,
                 std::string value,
                 std::shared_ptr<SharedValueRegistry> sharedValueRegistry);
    jsi::Value asValue(jsi::Runtime &rt) const override;
    jsi::Value asParameter(jsi::Runtime &rt) override;
    void setNewValue(std::shared_ptr<SharedValue> sv) override;
    std::vector<int> getSharedValues() override;
    std::shared_ptr<SharedValue> copy() override;
    ~SharedString();
};

#endif //REANIMATEDEXAMPLE_SHAREDSTRING_H
