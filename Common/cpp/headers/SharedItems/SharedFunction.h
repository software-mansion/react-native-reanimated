//
//  SharedFunction.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 17/03/2020.
//

#ifndef SharedFunction_h
#define SharedFunction_h

#include <stdio.h>
#include "SharedValue.h"
#include "Worklet.h"

class SharedFunction : public SharedValue {
public:
    int id;
    SharedFunction(int id, std::shared_ptr<Worklet> worklet);
    jsi::Value asValue(jsi::Runtime &rt) const override;
    jsi::Value asParameter(jsi::Runtime &rt) override;
    void setNewValue(std::shared_ptr<SharedValue> sv) override;
    std::vector<int> getSharedValues() override;
    std::shared_ptr<SharedValue> copy() override;
    ~SharedFunction();
private:
  std::shared_ptr<Worklet> worklet;
  jsi::Value parameter;
};

#endif /* SharedFunction_h */
