//
//  LayoutAnimationObserver.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 24/03/2021.
//

#include "LayoutAnimationsProxy.h"

namespace reanimated {

LayoutAnimationsProxy::LayoutAnimationsProxy(std::function<void(int, float)> _notifyAboutProgress): notifyAboutProgress(std::move(_notifyAboutProgress)) {
  
}

}
