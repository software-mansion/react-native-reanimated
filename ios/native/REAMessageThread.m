#import "REAMessageThread.h"

#include <condition_variable>
#include <mutex>

#import <React/RCTCxxUtils.h>
#import <React/RCTMessageThread.h>
#import <React/RCTUtils.h>

namespace facebook {
namespace react {

class REAMessageThreadPublic {
 public:
  REAMessageThreadPublic(NSRunLoop *runLoop, RCTJavaScriptCompleteBlock errorBlock);
  ~REAMessageThreadPublic();
  void runOnQueue(std::function<void()> &&);
  void runOnQueueSync(std::function<void()> &&);
  void quitSynchronous();
  void setRunLoop(NSRunLoop *runLoop);
  void tryFunc(const std::function<void()> &func);
  void runAsync(std::function<void()> func);
  void runSync(std::function<void()> func);

  CFRunLoopRef m_cfRunLoop;
  RCTJavaScriptCompleteBlock m_errorBlock;
  std::atomic_bool m_shutdown;
};

void REAMessageThread::quitSynchronous()
{
  REAMessageThreadPublic *reinterpreted = reinterpret_cast<REAMessageThreadPublic *>(this);
  reinterpreted->m_shutdown = true;
}

}
}
