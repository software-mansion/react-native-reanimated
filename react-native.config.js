// The new autolinking mechanism on Android (available from RN 0.70) for some reason
// also detects components from react-native but cannot find C++ implementation for them and it fails to compile the project.
// Most likely this is due to the fact that we use "react-native-reanimated": "link:../" in package.json.
// The solution is to disable codegen autolinking on Android. This is only necessary in FabricExample app.
module.exports = {
  dependencies: {
    'react-native-reanimated': {
      platforms: {
        android: {
          libraryName: null,
          componentDescriptors: null,
          androidMkPath: null,
        },
      },
    },
  },
};
