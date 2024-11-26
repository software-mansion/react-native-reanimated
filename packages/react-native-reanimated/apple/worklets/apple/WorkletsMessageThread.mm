#import <worklets/apple/WorkletsMessageThread.h>

#import <condition_variable>
#import <mutex>

#import <React/RCTCxxUtils.h>
#import <React/RCTMessageThread.h>
#import <React/RCTUtils.h>

namespace facebook {
namespace react {

// Essentially the same as RCTMessageThread, but with public fields.
struct WorkletsMessageThreadPublic {
  // I don't know why we need three vtables (if you know then feel free to#import
  // <worklets/apple/WorkletsMessageThread.h> explain it instead of this message), but this is what makes the casts
  // in quitSynchronous() work correctly.
  void *vtable1;
  void *vtable2;
  void *vtable3;
  CFRunLoopRef m_cfRunLoop;
  RCTJavaScriptCompleteBlock m_errorBlock;
  std::atomic_bool m_shutdown;
};

// We need to prevent any new code from being executed on the thread as there
// is an assertion for that in the destructor of RCTMessageThread, but we have
// to override quitSynchronous() as it would quit the main looper and freeze
// the app.
void WorkletsMessageThread::quitSynchronous()
{
  RCTMessageThread *rctThread = static_cast<RCTMessageThread *>(this);
  WorkletsMessageThreadPublic *rctThreadPublic = reinterpret_cast<WorkletsMessageThreadPublic *>(rctThread);
  rctThreadPublic->m_shutdown = true;
}

} // namespace react
} // namespace facebook
