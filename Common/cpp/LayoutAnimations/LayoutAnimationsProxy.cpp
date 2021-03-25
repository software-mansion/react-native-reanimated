//
//  LayoutAnimationObserver.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 24/03/2021.
//

#include "LayoutAnimationsProxy.h"
#include "MutableValue.h"
#include "ValueWrapper.h"
#include "ShareableValue.h"

namespace reanimated {

const long long idOffset = 1e9;

LayoutAnimationsProxy::LayoutAnimationsProxy(std::function<void(int, float)> _notifyAboutProgress): notifyAboutProgress(std::move(_notifyAboutProgress)) {
}

void LayoutAnimationsProxy::startObserving(int tag, std::shared_ptr<MutableValue> sv) {
  observedValues[tag] = sv;
  sv->addListener(tag + idOffset, [sv, tag, this](){
    double newValue = ValueWrapper::asNumber(sv->value->valueContainer);
    this->notifyAboutProgress(tag, newValue);
  });
}

void LayoutAnimationsProxy::stopObserving(int tag) {
  if (observedValues.count(tag) == 0) {
    return;
  }
  std::shared_ptr<MutableValue> sv = observedValues[tag];
  sv->removeListener(tag + idOffset);
  observedValues.erase(tag);
}

}
