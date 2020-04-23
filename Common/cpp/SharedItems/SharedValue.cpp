//
//  SharedValue.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 16/04/2020.
//

#include "SharedValue.h"

void SharedValue::makeDirty() {
  if (dirty) return;
  dirty = true;
  
  for (auto &listener : listeners) {
    listener.second();
  }
}

void SharedValue::registerForDirty(int id, std::function<void ()> fun) {
  listeners[id] = fun;
}

void SharedValue::unregisterFromDirty(int id) {
  if (listeners.count(id) > 0) {
    listeners.erase(id);
  }
}


