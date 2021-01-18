#include "ValueWrapper.h"

namespace reanimated {

const std::string ValueWrapper::getString(const std::unique_ptr<ValueWrapper>& valueContainer) {
  return static_cast<StringValueWrapper*>(valueContainer.get())->value;
};

const std::shared_ptr<FrozenObject> ValueWrapper::asFrozenObject(const std::unique_ptr<ValueWrapper>& valueContainer) {
  return static_cast<FrozenObjectWrapper*>(valueContainer.get())->value;
};

}
