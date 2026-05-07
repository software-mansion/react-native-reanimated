// Run this snippet in the JS runtime of any app linking
// `react-native-reanimated` >= the version that introduced
// RNRuntimeDecorator's "_WORKLET_RUNTIME" write (still present at
//   packages/react-native-reanimated/Common/cpp/reanimated/RuntimeDecorators/RNRuntimeDecorator.cpp:20
// pre-fix) and observe that any JS in the bundle can read the address of
// the C++ `jsi::Runtime` object that owns the UI worklet runtime.
//
// Reproduction harness used in the audit: pokemon (Expo / RN 0.81.5,
// react-native-reanimated 4.1.1, react-native-worklets 0.5.1).
//   1. Boot iOS sim, build/run pokemon, attach Metro CDP debugger.
//   2. Issue this expression via the debugger or paste it into
//      a button handler.
//   3. The 8-byte buffer carries the live UI-runtime pointer in
//      little-endian; observed value during the audit was
//      0x6000026434f8 — a malloc-nano-zone heap pointer, leaking
//      ASLR for that region to any JS in the bundle.
//
// Post-fix the global is gone, so an attacker who already has JS
// execution loses one ASLR oracle. Verify by re-running this snippet
// against the patched binary: `globalThis._WORKLET_RUNTIME` must be
// `undefined`.

(function infoLeak() {
  const buf = globalThis._WORKLET_RUNTIME;
  if (buf === undefined) {
    return { fixed: true, message: '_WORKLET_RUNTIME is undefined — info leak removed.' };
  }
  if (!(buf instanceof ArrayBuffer) || buf.byteLength !== 8) {
    return { fixed: 'unknown', message: 'unexpected shape', shape: buf };
  }
  const view = new Uint8Array(buf);
  const bytes = Array.from(view);
  let ptr = 0n;
  for (let i = 7; i >= 0; i--) {
    ptr = (ptr << 8n) | BigInt(bytes[i]);
  }
  return {
    fixed: false,
    message:
      'BUG REPRODUCED — read C++ `jsi::Runtime` address from the JS thread. ' +
      'This is unauthenticated to any JS in the bundle (third-party libs, ' +
      'OTA bundles, malicious devtools eval).',
    pointer_hex: '0x' + ptr.toString(16),
    little_endian_bytes: bytes
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' '),
  };
})();
