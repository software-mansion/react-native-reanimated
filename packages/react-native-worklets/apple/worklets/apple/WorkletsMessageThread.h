#pragma once

#import <Foundation/Foundation.h>
#import <React/RCTMessageThread.h>

namespace facebook {
namespace react {

class WorkletsMessageThread : public RCTMessageThread {
 public:
  using RCTMessageThread::RCTMessageThread;
  virtual void quitSynchronous() override;
};

} // namespace react
} // namespace facebook
