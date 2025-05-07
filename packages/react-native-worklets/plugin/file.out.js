const foobar = 5;
const baz = 2;
const _worklet_3843032433312_init_data = {
  code: "function foo_fileTs1(){const foo_fileTs1=this._recur;return foo_fileTs1()+foobar;}",
  location: "/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.ts",
  sourceMap: "{\"version\":3,\"names\":[\"foo_fileTs1\",\"_recur\",\"foobar\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/primary/packages/react-native-worklets/plugin/file.ts\"],\"mappings\":\"AAMA,SAAAA,WAAeA,CAAA,QAAAA,WAAA,MAAAC,MAAA,CAEb,MAAQ,CAAAD,WAAQ,GAAME,MAAA,CACxB\",\"ignoreList\":[]}",
  version: "0.3.0"
};
const foo = function foo_fileTs1Factory({
  _worklet_3843032433312_init_data
}) {
  const _e = [new global.Error(), 1, -27];
  const foo = function () {
    return foo() + foobar;
  };
  foo.__closure = {};
  foo.__workletHash = 3843032433312;
  foo.__initData = _worklet_3843032433312_init_data;
  foo.__stackDetails = _e;
  return foo;
}({
  _worklet_3843032433312_init_data
});
