
------ Changes required for AnimatedModule loading -------

in react-native-reanimated root:

curl -L https://github.com/coado/react-native/pull/30.patch \
  | sed 's|a/packages/react-native/|a/|g; s|b/packages/react-native/|b/|g' \
  | git apply --directory=node_modules/react-native --reject --verbose --check

or if rate limitted
copy patches from the above link to the patches.txt file and then:

cat patches.txt \
  | sed 's|a/packages/react-native/|a/|g; s|b/packages/react-native/|b/|g' \
  | git apply --directory=node_modules/react-native --reject --verbose --check


------- AnimationBackend changes --------

curl -L https://patch-diff.githubusercontent.com/raw/facebook/react-native/pull/54753.patch \
  | sed 's|a/packages/react-native/|a/|g; s|b/packages/react-native/|b/|g' \
  | git apply --directory=node_modules/react-native --reject --verbose --check




