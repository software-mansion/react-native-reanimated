#import "REAMessageThread.h"

#include <condition_variable>
#include <mutex>

#import <React/RCTCxxUtils.h>
#import <React/RCTMessageThread.h>
#import <React/RCTUtils.h>

namespace facebook {
namespace react {

struct REAMessageThreadPublic {
  void *vtable1;
  void *vtable2;
  void *vtable3;
  CFRunLoopRef m_cfRunLoop;
  RCTJavaScriptCompleteBlock m_errorBlock;
  std::atomic_bool m_shutdown;
};

void REAMessageThread::quitSynchronous()
{
  RCTMessageThread *p1 = static_cast<RCTMessageThread *>(this);
  REAMessageThreadPublic *p2 = reinterpret_cast<REAMessageThreadPublic *>(p1);
  p2->m_shutdown = true;
}

}
}
