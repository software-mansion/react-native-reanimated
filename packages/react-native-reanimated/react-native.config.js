module.exports = {
  spm: {
    name: 'RNReanimated',
    dependencies: ['react-native-worklets'],
  },
  dependency: {
    platforms: {
      android: {
        componentDescriptors: [
          'REASharedTransitionBoundaryComponentDescriptor',
        ],
        cmakeListsPath: '../Common/NativeView/CMakeLists.txt',
      },
    },
  },
};
