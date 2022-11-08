mkdir -p node_modules/react-native/android && \
    cd node_modules/react-native/android && \
    rm -rf react-native-0.71.0-rc.0-debug.aar && \
    wget https://repo1.maven.org/maven2/com/facebook/react/react-native/0.71.0-rc.0/react-native-0.71.0-rc.0-debug.aar

mkdir -p Example/node_modules/react-native/android && \
    cd Example/node_modules/react-native/android && \
    rm -rf react-native-0.71.0-rc.0-debug.aar && \
    wget https://repo1.maven.org/maven2/com/facebook/react/react-native/0.71.0-rc.0/react-native-0.71.0-rc.0-debug.aar
