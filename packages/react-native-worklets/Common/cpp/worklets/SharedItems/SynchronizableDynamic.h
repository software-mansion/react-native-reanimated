#pragma once

#include <worklets/SharedItems/Synchronizable.h>

#include <memory>

namespace worklets {

class SynchronizableDynamic final : public Synchronizable {
 public:
  explicit SynchronizableDynamic(const std::shared_ptr<Serializable> &value) : value_(value) {}

  SynchronizableValue getDirty() override;

  SynchronizableValue getBlocking() override;

  void setBlocking(const std::shared_ptr<Serializable> &value) override;

  void setBlocking(const SynchronizableFixedValue &value) override;

 private:
  std::shared_ptr<Serializable> value_;
};

} // namespace worklets
