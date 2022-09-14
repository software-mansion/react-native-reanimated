#import "REAMessageThread.h"

#include <condition_variable>
#include <mutex>

#import <React/RCTCxxUtils.h>
#import <React/RCTMessageThread.h>
#import <React/RCTUtils.h>

namespace facebook {
namespace react {

struct REAMessageThreadPublic {
  // I don't know why we need three vtables (if you know then feel free to
  // explain it insted of this message), but this is what makes the casts in
  // quitSynchronous() work correctly.
  void *vtable1;
  void *vtable2;
  void *vtable3;
  CFRunLoopRef m_cfRunLoop;
  RCTJavaScriptCompleteBlock m_errorBlock;
  std::atomic_bool m_shutdown;
};

void REAMessageThread::quitSynchronous()
{
  // We need to prevent any new code from being executed on the thread as there
  // is an assertion for that in the destructor of RCTMessageThread, but we have
  // to override quitSynchronous() as it would quit the main looper and freeze
  // the app.
  RCTMessageThread *p1 = static_cast<RCTMessageThread *>(this);
  REAMessageThreadPublic *p2 = reinterpret_cast<REAMessageThreadPublic *>(p1);
  p2->m_shutdown = true;
}

}
}
