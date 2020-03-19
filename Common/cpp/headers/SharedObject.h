//
//  SharedObject.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 19/03/2020.
//

#ifndef SharedObject_h
#define SharedObject_h

#include <stdio.h>

#include "SharedValue.h"
#include <vector>

class SharedObject : public SharedValue {
public:
    int id;
    SharedObject(int id, std::vector<std::shared_ptr<SharedValue>> svs);
    jsi::Value asValue(jsi::Runtime &rt) const override;
    jsi::Value asParameter(jsi::Runtime &rt) override;
    void setNewValue(std::shared_ptr<SharedValue> sv) override;
    ~SharedObject();
private:
  std::unordered_map<std::string, std::shared_ptr<SharedValue>> properties;
};

#endif /* SharedObject_h */
