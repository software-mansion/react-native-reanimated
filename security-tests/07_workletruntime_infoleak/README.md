# 07 — `_WORKLET_RUNTIME` heap-pointer info leak

## What

`RNRuntimeDecorator::decorate` (pre-fix) stashed `&uiRuntime` into an 8-byte
`ArrayBuffer` and exposed it on the JS global as `_WORKLET_RUNTIME`. No code
in this repo or in `react-native-worklets` ever read it back; static grep
for `_WORKLET_RUNTIME` across both packages returns only the C++ writer and
a TS type declaration.

## Why it matters

JS in a React Native bundle is shared by the app and every dependency.
A malicious dependency, OTA-pushed bundle, devtools eval, or any `eval`-
adjacent code path can read `globalThis._WORKLET_RUNTIME` and recover the
runtime address. That defeats ASLR for the malloc-nano-zone region holding
`jsi::Runtime` — primitive enough on its own to be an oracle, and useful
glue if combined with any other primitive that consumes a pointer-shaped
JS value.

## How to reproduce

Tested against **pokemon** (Expo SDK 54 / RN 0.81.5 / `react-native-
reanimated@4.1.1` / `react-native-worklets@0.5.1`) on `iPhone 16 Pro`
simulator (UDID `52DE854E-338D-4F8A-8EC9-13854C6EA239`):

```
cd ~/dev/pokemon && npx expo start --ios --port 8081
# attach Metro CDP debugger, then evaluate repro.js in the runtime
```

Observed during the audit:

```json
{
  "fixed": false,
  "pointer_hex": "0x6000026434f8",
  "little_endian_bytes": "f8 34 64 02 00 60 00 00"
}
```

Address is in `0x600000000000-0x700000000000`, the canonical macOS/iOS
malloc-nano-zone range — confirms it's a real C++ heap pointer.

## Post-fix

Re-run `repro.js`. Expected:

```json
{ "fixed": true, "message": "_WORKLET_RUNTIME is undefined — info leak removed." }
```
