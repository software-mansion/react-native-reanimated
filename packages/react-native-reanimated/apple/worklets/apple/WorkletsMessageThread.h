#pragma once

#import <Foundation/Foundation.h>
#import <React/RCTJavaScriptExecutor.h>
#import <React/RCTMessageThread.h>
#import <cxxreact/MessageQueueThread.h>
#import <memory>
#import <string>

namespace facebook {
namespace react {

class WorkletsMessageThread : public RCTMessageThread {
 public:
  using RCTMessageThread::RCTMessageThread;
  virtual void quitSynchronous() override;
};

} // namespace react
} // namespace facebook
