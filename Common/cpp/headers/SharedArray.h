//
//  SharedArray.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 19/03/2020.
//

#ifndef SharedArray_h
#define SharedArray_h

#include <stdio.h>

#include "SharedValue.h"
#include <vector>

class SharedArray : public SharedValue {
public:
    int id;
    SharedArray(int id, std::vector<std::shared_ptr<SharedValue>> svs);
    jsi::Value asValue(jsi::Runtime &rt) const override;
    jsi::Value asParameter(jsi::Runtime &rt) override;
    void setNewValue(std::shared_ptr<SharedValue> sv) override;
    ~SharedArray();
private:
  std::vector<std::shared_ptr<SharedValue>> svs;
};

#endif /* SharedArray_h */
