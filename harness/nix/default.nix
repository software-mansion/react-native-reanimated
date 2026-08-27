{
  pkgs,
  source,
}:

let
  inherit (pkgs) lib;
  stdenv = pkgs.llvmPackages.stdenv;
  catalog = builtins.fromJSON (builtins.readFile ./react-native-versions.json);
  packageJson = builtins.fromJSON (builtins.readFile ../../package.json);
  defaultReactNativeVersion = packageJson.devDependencies."react-native";
  sharedLibraryExtension = stdenv.hostPlatform.extensions.sharedLibrary;

  recordFor = version:
    if builtins.hasAttr version catalog.versions then
      catalog.versions.${version}
    else
      throw "React Native ${version} is not recorded; run harness/nix/run record-react-native";

  unpackTarball = name: archive:
    pkgs.runCommand name { nativeBuildInputs = [ pkgs.gnutar pkgs.gzip ]; } ''
      mkdir -p "$out"
      tar -xzf ${archive} --strip-components=1 -C "$out"
    '';

  projectSource = builtins.path {
    path = source;
    name = "layout-animation-harness-source";
    filter = path: type:
      let
        root = toString source;
        pathString = toString path;
        relative = if pathString == root then "" else lib.removePrefix "${root}/" pathString;
        inHarness = relative == "harness" || lib.hasPrefix "harness/" relative;
        inReanimated =
          relative == "packages"
          || relative == "packages/react-native-reanimated"
          || relative == "packages/react-native-reanimated/Common"
          || lib.hasPrefix "packages/react-native-reanimated/Common/" relative;
        inWorklets =
          relative == "packages/react-native-worklets"
          || relative == "packages/react-native-worklets/Common"
          || lib.hasPrefix "packages/react-native-worklets/Common/" relative;
        isBuild = relative == "harness/build" || lib.hasPrefix "harness/build/" relative;
      in
      relative == "" || ((inHarness && !isBuild) || inReanimated || inWorklets);
  };

  dependencyPrefixes = [
    pkgs.glog
    pkgs.fmt
    pkgs.double-conversion
    pkgs.gtest
  ];

  mkVersion = reactNativeVersion:
    let
      record = recordFor reactNativeVersion;
      reactNativeArchive = pkgs.fetchurl {
        url = "https://registry.npmjs.org/react-native/-/react-native-${reactNativeVersion}.tgz";
        hash = record.reactNativeHash;
      };
      reactNativeSource = unpackTarball "react-native-${reactNativeVersion}-source" reactNativeArchive;
      follyArchive = pkgs.fetchurl {
        url = "https://github.com/facebook/folly/archive/refs/tags/v${record.follyVersion}.tar.gz";
        hash = record.follyHash;
      };
      follySource = unpackTarball "folly-${record.follyVersion}-source" follyArchive;
      fbjniArchive = pkgs.fetchurl {
        url = "https://repo1.maven.org/maven2/com/facebook/fbjni/fbjni/${record.fbjniVersion}/fbjni-${record.fbjniVersion}.aar";
        hash = record.fbjniHash;
      };
      fbjni = pkgs.runCommand "fbjni-${record.fbjniVersion}-headers" { nativeBuildInputs = [ pkgs.unzip ]; } ''
        unzip -q ${fbjniArchive} -d fbjni
        cp -R fbjni/prefab/modules/fbjni/include "$out"
      '';
      hermesSource = unpackTarball "hermes-${record.hermesVersion}-source" (pkgs.fetchurl {
        url = "https://github.com/facebook/hermes/archive/refs/tags/hermes-v${record.hermesVersion}.tar.gz";
        hash = record.hermesHash;
      });
      hermes = stdenv.mkDerivation {
        pname = "hermesvm";
        version = record.hermesVersion;
        src = hermesSource;
        nativeBuildInputs = [ pkgs.cmake pkgs.ninja pkgs.python3 ];
        buildInputs = lib.optionals stdenv.hostPlatform.isLinux [ pkgs.icu ];
        cmakeBuildType = "Release";
        cmakeFlags = [
          "-DJSI_DIR=${reactNativeSource}/ReactCommon/jsi"
          "-DHERMES_ENABLE_TEST_SUITE=OFF"
          "-DHERMES_ENABLE_INTL=ON"
          "-DHERMES_ENABLE_DEBUGGER=OFF"
          "-DHERMES_BUILD_SHARED_JSI=OFF"
          "-DHERMES_BUILD_APPLE_FRAMEWORK=OFF"
          "-DHERMESVM_HEAP_HV_MODE=HEAP_HV_64"
          "-DHERMES_RELEASE_VERSION=RN-${reactNativeVersion}"
        ];
        buildPhase = ''
          runHook preBuild
          cmake --build . --target hermesvm --parallel "$NIX_BUILD_CORES"
          runHook postBuild
        '';
        installPhase = ''
          runHook preInstall
          mkdir -p "$out/lib" "$out/include/hermes" "$out/include/jsi" "$out/share/licenses/hermes"
          cp "lib/libhermesvm${sharedLibraryExtension}" "$out/lib/"
          cp -R ${hermesSource}/API/hermes/. "$out/include/hermes/"
          cp -R ${hermesSource}/public/hermes/Public "$out/include/hermes/"
          cp -R ${reactNativeSource}/ReactCommon/jsi/jsi/. "$out/include/jsi/"
          cp ${hermesSource}/LICENSE "$out/share/licenses/hermes/"
          runHook postInstall
        '';
      };
      cmakeFlags = [
        "-DCMAKE_BUILD_TYPE=Debug"
        "-DCMAKE_PREFIX_PATH=${lib.concatStringsSep ";" (map toString dependencyPrefixes)}"
        "-DFETCHCONTENT_FULLY_DISCONNECTED=ON"
        "-DHARNESS_USE_HOMEBREW=OFF"
        "-DHARNESS_USE_SYSTEM_GTEST=ON"
        "-DREACT_COMMON_DIR=${reactNativeSource}/ReactCommon"
        "-DREANIMATED_DIR=${projectSource}/packages/react-native-reanimated"
        "-DWORKLETS_DIR=${projectSource}/packages/react-native-worklets"
        "-DFOLLY_SOURCE_DIR=${follySource}"
        "-DFBJNI_INCLUDE_DIR=${fbjni}"
        "-DJAVA_HOME_DIR=${pkgs.jdk17_headless.home}"
        "-DHERMES_INCLUDE_DIR=${hermes}/include"
        "-DHERMES_LIBRARY=${hermes}/lib/libhermesvm${sharedLibraryExtension}"
        "-DBOOST_INCLUDE_DIR=${lib.getDev pkgs.boost183}/include"
        "-DFAST_FLOAT_INCLUDE_DIR=${lib.getDev pkgs.fast-float}/include"
      ];
      harness = stdenv.mkDerivation {
        pname = "layout-animation-harness";
        version = "rn-${reactNativeVersion}";
        src = projectSource;
        nativeBuildInputs = [ pkgs.cmake pkgs.ninja ];
        buildInputs = dependencyPrefixes ++ [
          pkgs.boost183
          pkgs.fast-float
          pkgs.jdk17_headless
          hermes
        ];
        cmakeDir = "../harness";
        inherit cmakeFlags;
        doCheck = true;
        checkPhase = ''
          runHook preCheck
          ctest --output-on-failure --parallel "$NIX_BUILD_CORES"
          runHook postCheck
        '';
        installPhase = ''
          runHook preInstall
          mkdir -p "$out/bin"
          cp harness_ios_tests harness_android_tests "$out/bin/"
          runHook postInstall
        '';
      };
    in
    {
      inherit cmakeFlags fbjni follySource harness hermes reactNativeSource;
    };

  defaultVersion = mkVersion defaultReactNativeVersion;
  buildDirectory = "build/layout-animation-harness-${pkgs.system}-rn-${defaultReactNativeVersion}";
  localRuntimeInputs = [
    pkgs.cmake
    pkgs.ninja
    pkgs.ccache
    stdenv.cc
  ];
  localBuild = pkgs.writeShellApplication {
    name = "layout-animation-build";
    runtimeInputs = localRuntimeInputs;
    text = ''
      if [[ ! -f package.json || ! -d harness ]]; then
        echo "Run this command from the Reanimated repository root." >&2
        exit 1
      fi
      cache_root="''${XDG_CACHE_HOME:-$HOME/.cache}/layout-animation-harness"
      mkdir -p "$cache_root/ccache"
      export CCACHE_DIR="$cache_root/ccache"
      cmake -S harness -B ${lib.escapeShellArg buildDirectory} -G Ninja \
        -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
        ${lib.escapeShellArgs defaultVersion.cmakeFlags} \
        -DREANIMATED_DIR="$PWD/packages/react-native-reanimated" \
        -DWORKLETS_DIR="$PWD/packages/react-native-worklets"
      cmake --build ${lib.escapeShellArg buildDirectory} --parallel
    '';
  };
  testProgram = pkgs.writeShellApplication {
    name = "layout-animation-test";
    runtimeInputs = [ localBuild pkgs.cmake ];
    text = ''
      layout-animation-build
      ctest --test-dir ${lib.escapeShellArg buildDirectory} --output-on-failure --parallel
    '';
  };
  dashboardProgram = pkgs.writeShellApplication {
    name = "layout-animation-dashboard";
    runtimeInputs = [ localBuild pkgs.nodejs pkgs.cmake pkgs.ninja ];
    text = ''
      layout-animation-build
      exec node harness/dashboard/server.mjs --build ${lib.escapeShellArg buildDirectory}
    '';
  };
  mutationProgram = pkgs.writeShellApplication {
    name = "layout-animation-mutation-test";
    runtimeInputs = [ localBuild pkgs.nodejs ] ++ localRuntimeInputs;
    text = ''
      layout-animation-build
      exec node harness/mutations/run.mjs --build ${lib.escapeShellArg buildDirectory} "$@"
    '';
  };
  recordProgram = pkgs.writeShellApplication {
    name = "record-react-native";
    runtimeInputs = [ pkgs.nix pkgs.nodejs pkgs.gnutar ];
    text = ''
      exec node harness/nix/record-react-native.mjs "$@"
    '';
  };
  versionPackages = builtins.listToAttrs (map (version: {
    name = "layout-animation-harness-rn-${lib.replaceStrings [ "." ] [ "_" ] version}";
    value = (mkVersion version).harness;
  }) (builtins.attrNames catalog.versions));
  nightlyMatrix = pkgs.linkFarm "layout-animation-harness-rn-matrix" (map (version: {
    name = "rn-${version}";
    path = (mkVersion version).harness;
  }) catalog.nightly);
  app = program: {
    type = "app";
    program = lib.getExe program;
  };
in
{
  packages = {
    default = defaultVersion.harness;
    layout-animation-harness = defaultVersion.harness;
    hermes = defaultVersion.hermes;
    rn-matrix = nightlyMatrix;
  } // versionPackages;

  checks = {
    layout-animation-harness = defaultVersion.harness;
    dashboard = pkgs.runCommand "layout-animation-dashboard-test" { nativeBuildInputs = [ pkgs.nodejs ]; } ''
      cd ${projectSource}/harness/dashboard
      node --test app.test.mjs
      touch "$out"
    '';
  };

  apps = {
    default = app testProgram;
    test = app testProgram;
    dashboard = app dashboardProgram;
    mutation = app mutationProgram;
    record-react-native = app recordProgram;
  };

  devShell = pkgs.mkShell {
    inputsFrom = [ defaultVersion.harness ];
    packages = [ localBuild testProgram dashboardProgram mutationProgram recordProgram pkgs.nodejs pkgs.ccache ];
    shellHook = ''
      echo "layout-animation-test | layout-animation-dashboard | layout-animation-mutation-test"
    '';
  };
}
