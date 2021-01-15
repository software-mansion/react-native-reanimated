#include "ValueWrapper.h"

namespace reanimated {

const std::string ValueWrapper::getString(const std::unique_ptr<ValueWrapper>& valueContainer) {
  return static_cast<StringValueWrapper*>(valueContainer.get())->value;
}; //TODO: consider to implement getters for all of types

}
