const _worklet_7390241086916_init_data = {
  code: "function fileJs1(){const{mutable}=this.__closure;return mutable.value;}",
  location: "/Users/bigpoppe/swmansion/reanimated/ternary/packages/react-native-worklets/plugin/file.js",
  sourceMap: "{\"version\":3,\"names\":[\"fileJs1\",\"mutable\",\"__closure\",\"value\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/ternary/packages/react-native-worklets/plugin/file.js\"],\"mappings\":\"AAEmB,SAAAA,QAAA,QAAAC,OAAA,OAAAC,SAAA,OAAM,CAAAD,OAAQ,CAAAE,KAAA\",\"ignoreList\":[]}"
};
const _worklet_10035757473443_init_data = {
  code: "function fileJs2(){const{mutable,newValue}=this.__closure;mutable._value=newValue;}",
  location: "/Users/bigpoppe/swmansion/reanimated/ternary/packages/react-native-worklets/plugin/file.js",
  sourceMap: "{\"version\":3,\"names\":[\"fileJs2\",\"mutable\",\"newValue\",\"__closure\",\"_value\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/ternary/packages/react-native-worklets/plugin/file.js\"],\"mappings\":\"AAKY,SAAAA,OAAMA,CAAA,QAAAC,OAAA,CAAAC,QAAA,OAAAC,SAAA,CACZF,OAAO,CAACG,MAAM,CAAGF,QAAQ,CAC3B\",\"ignoreList\":[]}"
};
const _worklet_17401650878716_init_data = {
  code: "function fileJs3(){const{mutable}=this.__closure;return mutable.value+1;}",
  location: "/Users/bigpoppe/swmansion/reanimated/ternary/packages/react-native-worklets/plugin/file.js",
  sourceMap: "{\"version\":3,\"names\":[\"fileJs3\",\"mutable\",\"__closure\",\"value\"],\"sources\":[\"/Users/bigpoppe/swmansion/reanimated/ternary/packages/react-native-worklets/plugin/file.js\"],\"mappings\":\"AASO,SAAAA,OAAMA,CAAA,QAAAC,OAAA,OAAAC,SAAA,CAET,MAAO,CAAAD,OAAO,CAACE,KAAK,CAAG,CAAC,CAC1B\",\"ignoreList\":[]}"
};
const mutable = dupa({
  get value() {
    return runOnUI(function fileJs1Factory({
      _worklet_7390241086916_init_data,
      mutable
    }) {
      const _e = [new global.Error(), -2, -27];
      const fileJs1 = () => mutable.value;
      fileJs1.__closure = {
        mutable
      };
      fileJs1.__workletHash = 7390241086916;
      fileJs1.__unresolvables = ["mutable"];
      fileJs1.__pluginVersion = "0.7.0-main";
      fileJs1.__initData = _worklet_7390241086916_init_data;
      fileJs1.__stackDetails = _e;
      return fileJs1;
    }({
      _worklet_7390241086916_init_data,
      mutable
    }))();
  },
  set value(newValue) {
    runOnUI(function fileJs2Factory({
      _worklet_10035757473443_init_data,
      mutable,
      newValue
    }) {
      const _e = [new global.Error(), -3, -27];
      const fileJs2 = function () {
        mutable._value = newValue;
      };
      fileJs2.__closure = {
        mutable,
        newValue
      };
      fileJs2.__workletHash = 10035757473443;
      fileJs2.__unresolvables = ["mutable"];
      fileJs2.__pluginVersion = "0.7.0-main";
      fileJs2.__initData = _worklet_10035757473443_init_data;
      fileJs2.__stackDetails = _e;
      return fileJs2;
    }({
      _worklet_10035757473443_init_data,
      mutable,
      newValue
    }))();
  },
  bob: function fileJs3Factory({
    _worklet_17401650878716_init_data,
    mutable
  }) {
    const _e = [new global.Error(), -2, -27];
    const fileJs3 = function () {
      return mutable.value + 1;
    };
    fileJs3.__closure = {
      mutable
    };
    fileJs3.__workletHash = 17401650878716;
    fileJs3.__unresolvables = ["mutable"];
    fileJs3.__pluginVersion = "0.7.0-main";
    fileJs3.__initData = _worklet_17401650878716_init_data;
    fileJs3.__stackDetails = _e;
    return fileJs3;
  }({
    _worklet_17401650878716_init_data,
    mutable
  })
});

// console.log(mutable.bob());

function runOnUI(worklet) {
  return worklet;
}
function dupa(mut) {
  // mut.bob
  // console.log(mut.bob());
}
