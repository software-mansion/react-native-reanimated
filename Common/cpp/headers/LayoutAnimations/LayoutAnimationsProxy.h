//
//  LayoutAnimationObserver.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 24/03/2021.
//

#ifndef LayoutAnimationsProxy_h
#define LayoutAnimationsProxy_h

#include <stdio.h>
#include <memory>
#include <functional>
#include "MutableValue.h"

namespace reanimated {

class LayoutAnimationsProxy {
  
public:
  LayoutAnimationsProxy(std::function<void(int, float)> _notifyAboutProgress);
  
  void startObserving(int tag, std::shared_ptr<MutableValue> sv);
  void stopObserving(int tag);
  
private:
  std::function<void(int, float)> notifyAboutProgress;
};

}

#endif /* LayoutAnimationsProxy_h */
