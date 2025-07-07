#pragma once

#include <memory>

namespace reanimated {

template<typename T>
class ReferenceContainer : public std::enable_shared_from_this<ReferenceContainer<T>> {
  T value_;
public:
  explicit ReferenceContainer(T &value) : value_(value) {}

  std::weak_ptr<ReferenceContainer> getWeak() {
    return this->weak_from_this();
  }

  T getValue() {
    return value_;
  }
};

template<typename T>
class WeakableReference {
  std::shared_ptr<ReferenceContainer<T>> value_;
public:
  explicit WeakableReference(T &value) : value_(std::make_shared<ReferenceContainer<T>>(value)) {}

  std::weak_ptr<ReferenceContainer<T>> getWeak() {
    return value_->getWeak();
  }
};

} // namespace reanimated