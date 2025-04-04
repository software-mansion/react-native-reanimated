require "json"
require_relative './scripts/worklets_utils'

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
$worklets_config = worklets_find_config()
worklets_assert_minimal_react_native_version($worklets_config)

ios_min_version = '13.4'

rn79_hermes_regression_workaround_flag = "HERMES_ENABLE_DEBUGGER=1"

Pod::Spec.new do |s|
  s.name         = "RNWorklets"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/software-mansion/react-native-reanimated"
  s.license      = package["license"]
  s.authors      = { "author" => "author@domain.com" }
  s.platforms    = { :ios => ios_min_version, :tvos => "9.0", :osx => "10.14", :visionos => "1.0" }
  s.source       = { :git => "https://github.com/software-mansion/react-native-reanimated.git", :tag => "#{s.version}" }

  s.subspec "worklets" do |ss|
    ss.source_files = "Common/cpp/worklets/**/*.{cpp,h}"
    ss.header_dir = "worklets"
    ss.header_mappings_dir = "Common/cpp/worklets"

    ss.subspec "apple" do |sss|
      # Please be careful with the snakes.
      # 🐍🐍🐍
      # Thank you for your understanding.
      sss.source_files = "apple/worklets/**/*.{mm,h,m}"
      sss.header_dir = "worklets"
      sss.header_mappings_dir = "apple/worklets"
    end
  end

  # Use install_modules_dependencies helper to install the dependencies.
  # See https://github.com/facebook/react-native/blob/c925872e72d2422be46670777bfa2111e13c9e4c/packages/react-native/scripts/cocoapods/new_architecture.rb#L71.
  install_modules_dependencies(s)
  
  s.pod_target_xcconfig = {
    "USE_HEADERMAP" => "YES",
    "DEFINES_MODULE" => "YES",
    "HEADER_SEARCH_PATHS" => [
      '"$(PODS_TARGET_SRCROOT)/ReactCommon"',
      '"$(PODS_TARGET_SRCROOT)"',
      '"$(PODS_ROOT)/RCT-Folly"',
      '"$(PODS_ROOT)/boost"',
      '"$(PODS_ROOT)/boost-for-react-native"',
      '"$(PODS_ROOT)/DoubleConversion"',
      '"$(PODS_ROOT)/Headers/Private/React-Core"',
      '"$(PODS_ROOT)/Headers/Private/Yoga"',
    ].join(' '),
    "FRAMEWORK_SEARCH_PATHS" => '"${PODS_CONFIGURATION_BUILD_DIR}/React-hermes"',
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "GCC_PREPROCESSOR_DEFINITIONS[config=Debug]" => rn79_hermes_regression_workaround_flag,
  }
  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => [
      '"$(PODS_ROOT)/boost"',
      '"$(PODS_ROOT)/boost-for-react-native"',
      '"$(PODS_ROOT)/glog"',
      '"$(PODS_ROOT)/RCT-Folly"',
      '"$(PODS_ROOT)/Headers/Public/React-hermes"',
      '"$(PODS_ROOT)/Headers/Public/hermes-engine"',
      "\"$(PODS_ROOT)/#{$worklets_config[:react_native_common_dir]}\"",
      "\"$(PODS_ROOT)/#{$worklets_config[:dynamic_frameworks_worklets_dir]}/apple\"",
      "\"$(PODS_ROOT)/#{$worklets_config[:dynamic_frameworks_worklets_dir]}/Common/cpp\"",
    ].join(' '),
  }
  
end
