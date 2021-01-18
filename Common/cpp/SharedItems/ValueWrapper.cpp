#include "ValueWrapper.h"

namespace reanimated {

const std::string ValueWrapper::getString(const std::unique_ptr<ValueWrapper>& valueContainer) {
  return static_cast<StringValueWrapper*>(valueContainer.get())->value;
};

const std::shared_ptr<FrozenObject> ValueWrapper::asFrozenObject(const std::unique_ptr<ValueWrapper>& valueContainer) {
  return static_cast<FrozenObjectWrapper*>(valueContainer.get())->value;
};

const std::shared_ptr<RemoteObject> ValueWrapper::asRemoteObject(const std::unique_ptr<ValueWrapper>& valueContainer) {
  return static_cast<RemoteObjectWrapper*>(valueContainer.get())->value;
};

const std::vector<std::shared_ptr<ShareableValue>> ValueWrapper::asFrozenArray(const std::unique_ptr<ValueWrapper>& valueContainer) {
  return static_cast<FrozenArrayWrapper*>(valueContainer.get())->value;
};

}
