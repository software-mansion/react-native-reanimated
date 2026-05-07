// Demonstrates the "silently return nullptr" anti-pattern in
//   packages/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.cpp
// (pre-fix lines 127-141):
//
//   inline std::shared_ptr<AsyncQueue> extractAsyncQueue(
//       jsi::Runtime &rt, const jsi::Value &value) {
//     if (!value.isObject())            return nullptr;
//     const auto object = value.asObject(rt);
//     if (!object.hasNativeState(rt))   return nullptr;
//     const auto &nativeState = object.getNativeState(rt);
//     auto asyncQueue = std::dynamic_pointer_cast<AsyncQueue>(nativeState);
//     return asyncQueue;            // <- can be null, returned silently
//   }
//
// The single caller (`createWorkletRuntime`, JSIWorkletsModuleProxy.cpp:409)
// did not check the return value and forwarded it straight into
// `RuntimeManager::createWorkletRuntime(...)`, which stored it on the new
// `WorkletRuntime`. The eventual null deref happens far from the bad input
// and is a poor diagnostic — the user never sees "your queue arg was wrong".
//
// Compiling JSIWorkletsModuleProxy.cpp itself requires <jsi/jsi.h> + folly +
// worklets internal headers, so this repro mirrors the silent-null contract
// as a tiny C++ test:
//
//   1. Buggy form returns nullptr for any invalid input. Caller treats it as
//      a valid AsyncQueue and dereferences. Reproduces the "remote crash" —
//      the crash site is unrelated to the actual input shape.
//   2. Fixed form throws at the boundary; the caller never sees nullptr.
//
// Cross-check the fix:
//   git -C ../../.. log -p -- packages/react-native-worklets/Common/cpp/worklets/NativeModules/JSIWorkletsModuleProxy.cpp \
//     | sed -n '/extractAsyncQueue/,/^}/p' | head -40

#include <csignal>
#include <cstdio>
#include <cstdlib>
#include <memory>
#include <stdexcept>
#include <string>

namespace {

struct NativeState {
  virtual ~NativeState() = default;
};

// Stand-in for `AsyncQueue`. `schedule()` reads a member, exactly like the
// real one (which touches its task list). Without a real member-read, modern
// -O0 compilers happily call a no-op method on a null `this` because nothing
// touches `this`, which would mask the bug. We force the same shape here.
struct AsyncQueue : NativeState {
  int taskCount_ = 0;
  void schedule() { ++taskCount_; }
};

// Some other library's NativeState (e.g. expo SharedObject).
struct ForeignNativeState : NativeState {};

enum class Shape {
  Valid,           // points to a real AsyncQueue
  WrongType,       // points to a different NativeState subclass
  None,            // no native state at all (nullptr)
};

// Mirror of buggy extractAsyncQueue. Returns nullptr for the wrong-shape
// inputs without telling the caller anything went wrong.
std::shared_ptr<AsyncQueue> buggyExtract(
    Shape shape,
    const std::shared_ptr<NativeState> &state) {
  if (shape == Shape::None) {
    return nullptr;
  }
  return std::dynamic_pointer_cast<AsyncQueue>(state);
}

// Mirror of the fix: throw a JSError-equivalent at the boundary so the user
// sees "your queue arg was wrong" instead of a remote SEGV in unrelated code.
std::shared_ptr<AsyncQueue> fixedExtract(
    Shape shape,
    const std::shared_ptr<NativeState> &state) {
  if (shape == Shape::None) {
    throw std::runtime_error(
        "[Worklets] createWorkletRuntime: queue argument must be an AsyncQueue.");
  }
  auto q = std::dynamic_pointer_cast<AsyncQueue>(state);
  if (!q) {
    throw std::runtime_error(
        "[Worklets] createWorkletRuntime: queue argument must be an AsyncQueue.");
  }
  return q;
}

// Mirror of `createWorkletRuntime`'s line 409 area: it stored the (possibly
// null) queue on the new runtime; the eventual user-visible crash happened
// when something later tried to schedule on it. We model that by using the
// returned pointer immediately.
struct WorkletRuntime {
  std::shared_ptr<AsyncQueue> queue;
  void scheduleSomething() {
    // BAD: dereferences queue without a null check (mirrors the real
    // RuntimeManager flow that kept the null queue around then deref'd it).
    queue->schedule();
  }
};

volatile std::sig_atomic_t saw_segv = 0;

void on_segv(int) {
  saw_segv = 1;
  std::_Exit(139);
}

} // namespace

int main(int argc, char **argv) {
  std::printf(
      "[06_asyncqueue_silent_null] proving silent-null contract violation\n");

  if (argc == 2 && std::string(argv[1]) == "--child-buggy-wrong-type") {
    std::signal(SIGSEGV, on_segv);
    auto foreign = std::make_shared<ForeignNativeState>();
    WorkletRuntime wr{ buggyExtract(Shape::WrongType, foreign) };
    if (!wr.queue) {
      std::printf("    [observed] buggyExtract returned nullptr silently\n");
    }
    wr.scheduleSomething(); // null deref
    std::printf("    [unreachable] queue->schedule() returned\n");
    return 0;
  }

  if (argc == 2 && std::string(argv[1]) == "--child-buggy-no-state") {
    std::signal(SIGSEGV, on_segv);
    WorkletRuntime wr{ buggyExtract(Shape::None, nullptr) };
    if (!wr.queue) {
      std::printf("    [observed] buggyExtract returned nullptr silently\n");
    }
    wr.scheduleSomething(); // null deref
    std::printf("    [unreachable] queue->schedule() returned\n");
    return 0;
  }

  // --- Buggy: wrong native state type ---------------------------------------
  std::printf("  buggy/wrong_type: child crashes far from the bad input...\n");
  std::string self = argv[0];
  int rc = std::system((self + " --child-buggy-wrong-type").c_str());
  if (rc != 0) {
    std::printf("    [BUG REPRODUCED] child exited non-zero (%d) — null queue deref\n", rc);
  } else {
    std::printf("    [FAIL] child returned 0\n");
    return 1;
  }

  // --- Buggy: no native state at all ---------------------------------------
  std::printf("  buggy/no_state:   same outcome from a different bad shape...\n");
  rc = std::system((self + " --child-buggy-no-state").c_str());
  if (rc != 0) {
    std::printf("    [BUG REPRODUCED] child exited non-zero (%d) — null queue deref\n", rc);
  } else {
    std::printf("    [FAIL] child returned 0\n");
    return 1;
  }

  // --- Fixed: same inputs produce a clean throw at the boundary ------------
  std::printf("  fixed: both wrong-shape inputs throw at extractAsyncQueue...\n");
  for (auto shape : { Shape::WrongType, Shape::None }) {
    bool threw = false;
    try {
      fixedExtract(shape, std::make_shared<ForeignNativeState>());
    } catch (const std::runtime_error &e) {
      threw = true;
      std::printf("    [OK] %s\n", e.what());
    }
    if (!threw) {
      std::printf("    [FAIL] fixedExtract did not throw\n");
      return 1;
    }
  }

  // --- Fixed: valid input still passes ------------------------------------
  auto good = std::make_shared<AsyncQueue>();
  auto q = fixedExtract(Shape::Valid, good);
  if (q == good) {
    std::printf("    [OK] fixedExtract returns the queue for a valid AsyncQueue\n");
  } else {
    std::printf("    [FAIL] fixedExtract did not return the original AsyncQueue\n");
    return 1;
  }

  return 0;
}
