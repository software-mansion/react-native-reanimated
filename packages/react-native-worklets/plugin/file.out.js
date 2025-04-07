import { __registerWorkletFactory, __getWorklet } from "react-native-worklets";
import { __registerWorkletFactory, __getWorklet } from "react-native-worklets";
import { __registerWorkletFactory, __getWorklet } from "react-native-worklets";
import { __registerWorkletFactory, __getWorklet } from "react-native-worklets";
import { __registerWorkletFactory, __getWorklet } from "react-native-worklets";
import { useEffect } from 'react';
import { isWorkletFunction, runOnUI } from 'react-native-worklets';
const _worklet_5033656761471_init_data = {
  code: "function foo_fileJs1(){const{mydlo,widlo}=this.__closure;return mydlo+widlo;}",
  location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js",
  sourceMap: "{\"version\":3,\"names\":[\"foo_fileJs1\",\"mydlo\",\"widlo\",\"__closure\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js\"],\"mappings\":\"AAOE,SAAAA,WAAeA,CAAA,QAAAC,KAAA,CAAAC,KAAA,OAAAC,SAAA,CAEb,MAAO,CAAAF,KAAK,CAAGC,KAAK,CACtB\",\"ignoreList\":[]}",
  version: "0.2.0"
};
function foo_fileJs1Factory(__worklet_5033656761471_init_data, _mydlo, _widlo) {
  const _e = [new global.Error(), -3, -27];
  const foo = function () {
    return _mydlo + _widlo;
  };
  foo.__closure = {
    mydlo: _mydlo,
    widlo: _widlo
  };
  foo.__workletHash = 5033656761471;
  foo.__initData = __worklet_5033656761471_init_data;
  foo.__stackDetails = _e;
  return foo;
}
__registerWorkletFactory(5033656761471, foo_fileJs1Factory);
export default function App() {
  const mydlo = 'smiglo';
  const widlo = 'powidlo';
  const foo = __getWorklet(5033656761471, _worklet_5033656761471_init_data, mydlo, widlo);
  useEffect(() => {
    runOnUI(foo)();
  }, []);
  return null;
}
const _worklet_17337998688438_init_data = {
  code: "function foo_fileJs2(){}",
  location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js",
  sourceMap: "{\"version\":3,\"names\":[\"foo_fileJs2\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js\"],\"mappings\":\"AAmBO,SAAAA,WAEPA,CAAA\",\"ignoreList\":[]}",
  version: "0.2.0"
};
function foo_fileJs2Factory(__worklet_17337998688438_init_data) {
  const _e = [new global.Error(), 1, -27];
  const foo = function () {};
  foo.__closure = {};
  foo.__workletHash = 17337998688438;
  foo.__initData = __worklet_17337998688438_init_data;
  foo.__stackDetails = _e;
  return foo;
}
__registerWorkletFactory(17337998688438, foo_fileJs2Factory);
export const foo = __getWorklet(17337998688438, _worklet_17337998688438_init_data);
const _worklet_11678302571332_init_data = {
  code: "function fileJs3(){const{isWorkletFunction,foo}=this.__closure;isWorkletFunction(foo);}",
  location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js",
  sourceMap: "{\"version\":3,\"names\":[\"fileJs3\",\"isWorkletFunction\",\"foo\",\"__closure\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js\"],\"mappings\":\"AAuBmB,SAAAA,OAAMA,CAAA,QAAAC,iBAAA,CAAAC,GAAA,OAAAC,SAAA,CAEvBF,iBAAiB,CAACC,GAAG,CAAC,CACxB\",\"ignoreList\":[]}",
  version: "0.2.0"
};
function fileJs3Factory(__worklet_11678302571332_init_data, _isWorkletFunction, _foo) {
  const _e = [new global.Error(), -3, -27];
  const fileJs3 = function () {
    _isWorkletFunction(_foo);
  };
  fileJs3.__closure = {
    isWorkletFunction: _isWorkletFunction,
    foo: _foo
  };
  fileJs3.__workletHash = 11678302571332;
  fileJs3.__initData = __worklet_11678302571332_init_data;
  fileJs3.__stackDetails = _e;
  return fileJs3;
}
__registerWorkletFactory(11678302571332, fileJs3Factory);
export const bar = __getWorklet(11678302571332, _worklet_11678302571332_init_data, isWorkletFunction, foo);
const _worklet_14704453457449_init_data = {
  code: "function fileJs4(){}",
  location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js",
  sourceMap: "{\"version\":3,\"names\":[\"fileJs4\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js\"],\"mappings\":\"AA4BsB,SAAAA,OAEtBA,CAAA\",\"ignoreList\":[]}",
  version: "0.2.0"
};
function fileJs4Factory(__worklet_14704453457449_init_data) {
  const _e = [new global.Error(), 1, -27];
  const fileJs4 = function () {};
  fileJs4.__closure = {};
  fileJs4.__workletHash = 14704453457449;
  fileJs4.__initData = __worklet_14704453457449_init_data;
  fileJs4.__stackDetails = _e;
  return fileJs4;
}
__registerWorkletFactory(14704453457449, fileJs4Factory);
export const foobar = __getWorklet(14704453457449, _worklet_14704453457449_init_data);
const _worklet_10834592501248_init_data = {
  code: "function barfoo_fileJs5(){}",
  location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js",
  sourceMap: "{\"version\":3,\"names\":[\"barfoo_fileJs5\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.js\"],\"mappings\":\"AAgCsB,SAAAA,cAEtBA,CAAA\",\"ignoreList\":[]}",
  version: "0.2.0"
};
function barfoo_fileJs5Factory(__worklet_10834592501248_init_data) {
  const _e = [new global.Error(), 1, -27];
  const barfoo = function () {};
  barfoo.__closure = {};
  barfoo.__workletHash = 10834592501248;
  barfoo.__initData = __worklet_10834592501248_init_data;
  barfoo.__stackDetails = _e;
  return barfoo;
}
__registerWorkletFactory(10834592501248, barfoo_fileJs5Factory);
export const barfoo = __getWorklet(10834592501248, _worklet_10834592501248_init_data);
