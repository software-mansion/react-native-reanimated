module.exports = {
  dependency: {
    platforms: {
      android: {
        componentDescriptors: [
          'RNReanimatedSharedTransitionBoundaryComponentDescriptor',
        ],
        cmakeListsPath: '../Common/NativeView/CMakeLists.txt',
      },
    },
  },
};
