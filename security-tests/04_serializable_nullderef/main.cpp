// Demonstrates the unchecked null pointer dereference in
//   packages/react-native-worklets/Common/cpp/worklets/SharedItems/Serializable.cpp
// (pre-fix line 88):
//
//   if (object.hasNativeState(rt)) {
//     auto nativeState = object.getNativeState(rt);
//     return std::dynamic_pointer_cast<SerializableJSRef>(nativeState)->value();
//   }
//
// `extractSerializableOrThrow` is called for every JS-supplied "serializable"
// argument crossing into the worklets C++ side (scheduleOnUI, runOnUISync,
// runOnRuntimeSync, createSynchronizable, createShareable, …). It asks JSI
// "does the object carry a NativeState?" and trusts that the answer is always
// a SerializableJSRef instance. It is not: any other library can install its
// own NativeState — `expo-modules-core` SharedObjects, RN's runtime-scheduler
// Task primitives, and any TurboModule that uses `setNativeState` all qualify.
// When such an object reaches the cast above, dynamic_pointer_cast returns
// nullptr and the next `->value()` is UB / SIGSEGV.
//
// Compiling Serializable.cpp itself requires <jsi/jsi.h> + folly + worklets'
// internal headers (the prior 02_arraybuffer_truncation reproducer hit the
// same wall and resorted to a mirrored translation unit), so this repro
// recreates the exact dynamic_pointer_cast / `->value()` shape on a tiny base
// class hierarchy and proves both:
//
//   1. The buggy expression segfaults when the underlying state isn't a
//      `SerializableJSRef`.
//   2. The fixed expression (null-check + throw) reaches the throw site
//      cleanly without dereferencing nullptr.
//
// Cross-check the fix lives where claimed:
//   git -C ../../.. log -p -- packages/react-native-worklets/Common/cpp/worklets/SharedItems/Serializable.cpp \
//     | sed -n '/extractSerializableOrThrow/,/^}/p' | head -50

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

// Stand-in for `SerializableJSRef` — `value()` reads a member, exactly like
// the real one (`return value_;`). Without a real member-read, modern -O0
// compilers will happily call a method on a null `this` because nothing
// touches `this`, which would mask the bug. We force the same shape here.
struct SerializableJSRef : NativeState {
  std::shared_ptr<int> value_ = std::make_shared<int>(42);
  std::shared_ptr<int> value() const { return value_; }
};

// Stand-in for "some other library's NativeState" — e.g. expo's
// SharedObject::NativeState.  The only requirement is that it is *not* a
// SerializableJSRef; expo-modules-core's SharedObject::NativeState fits this
// exactly and is reachable on every Expo / Bridgeless RN app.
struct ForeignNativeState : NativeState {
  int marker = 0xdeadbeef;
};

// Mirrors the buggy two-liner verbatim.
std::shared_ptr<int> buggy(const std::shared_ptr<NativeState> &nativeState) {
  return std::dynamic_pointer_cast<SerializableJSRef>(nativeState)->value();
}

// Mirrors the patched form.
std::shared_ptr<int> fixed(const std::shared_ptr<NativeState> &nativeState) {
  auto serializableRef = std::dynamic_pointer_cast<SerializableJSRef>(nativeState);
  if (!serializableRef) {
    throw std::runtime_error("[Worklets] not a SerializableJSRef");
  }
  return serializableRef->value();
}

volatile std::sig_atomic_t saw_segv = 0;

void on_segv(int) {
  saw_segv = 1;
  // We can't safely return from a real SEGV signal handler; abort with a
  // distinctive code so the runner can detect it.
  std::_Exit(139);
}

} // namespace

int main(int argc, char **argv) {
  std::printf("[04_serializable_nullderef] proving the dynamic_pointer_cast nullptr deref pattern\n");

  // --- Case A: the buggy form ----------------------------------------------
  // Run as a child so a SEGV here doesn't kill the whole runner.
  if (argc == 2 && std::string(argv[1]) == "--child-buggy") {
    std::signal(SIGSEGV, on_segv);
    std::shared_ptr<NativeState> foreign = std::make_shared<ForeignNativeState>();
    auto v = buggy(foreign); // null deref
    std::printf("    buggy returned %p (should have crashed)\n", static_cast<void *>(v.get()));
    return 0;
  }

  std::printf("  buggy: spawning child to dereference null shared_ptr...\n");
  std::string self = argv[0];
  std::string cmd = self + " --child-buggy";
  int rc = std::system(cmd.c_str());
  // Common SIGSEGV exit codes: 139 (128+11) on most Unixes, may vary.
  if (rc == 139 || rc == 11 || rc == (11 << 8) /* WIFSIGNALED encoding */) {
    std::printf("    [BUG REPRODUCED] child exited with SEGV-equivalent code %d\n", rc);
  } else if (rc != 0) {
    // Some runtimes deliver SIGSEGV via a non-139 code (e.g. when the kernel
    // converts to SIGBUS, or ASan/UBSan reports). Treat any non-zero exit as
    // a crash too, since the child only returns 0 if the deref *didn't*
    // crash.
    std::printf("    [BUG REPRODUCED] child exited non-zero (%d) — buggy form did not survive\n", rc);
  } else {
    std::printf("    [FAIL] child returned 0; the deref did not crash. Compiler optimised the cast?\n");
    return 1;
  }

  // --- Case B: the fixed form ----------------------------------------------
  std::printf("  fixed: same input must throw cleanly without crashing...\n");
  std::shared_ptr<NativeState> foreign = std::make_shared<ForeignNativeState>();
  bool threw = false;
  try {
    auto v = fixed(foreign);
    std::printf("    [FAIL] fixed form did not throw on foreign NativeState\n");
    return 1;
  } catch (const std::runtime_error &e) {
    threw = true;
    std::printf("    [OK] caught std::runtime_error (\"%s\")\n", e.what());
  }
  if (!threw) return 1;

  // Cross-check: a real SerializableJSRef should still pass through.
  std::shared_ptr<NativeState> good = std::make_shared<SerializableJSRef>();
  auto v = fixed(good);
  std::printf("    [OK] fixed form returns the value (%d) for a real SerializableJSRef\n", *v);

  return 0;
}
