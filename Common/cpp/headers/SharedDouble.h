//
// Created by Szymon Kapala on 2020-02-11.
//

#ifndef REANIMATEDEXAMPLE_SHAREDDOUBLE_H
#define REANIMATEDEXAMPLE_SHAREDDOUBLE_H

#include "SharedValue.h"

class SharedDouble : public SharedValue {
  public:
    double value;
    int id;
    SharedDouble(int id, double value);
    jsi::Value asValue(jsi::Runtime &rt) const override;
    jsi::Value asParameter(jsi::Runtime &rt) override;
    void setNewValue(std::shared_ptr<SharedValue> sv) override;
    ~SharedDouble();
};

#endif //REANIMATEDEXAMPLE_SHAREDDOUBLE_H
