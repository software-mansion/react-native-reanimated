#pragma once

namespace worklets {
    
class AroundLock {
    const std::shared_ptr<std::recursive_mutex> mutex_;
  
   public:
    explicit AroundLock(const std::shared_ptr<std::recursive_mutex> &mutex)
        : mutex_(mutex) {}
  
    void before() const {
      mutex_->lock();
    }
  
    void after() const {
      mutex_->unlock();
    }
  };

} // namespace worklets
