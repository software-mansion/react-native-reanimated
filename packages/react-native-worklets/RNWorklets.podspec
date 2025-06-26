require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "RNWorklets"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/software-mansion/react-native-reanimated"
  s.license      = package["license"]
  s.authors      = { "author" => "author@domain.com" }
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/software-mansion/react-native-reanimated.git", :tag => "#{s.version}" }

  s.source_files = "apple/*.{h,m,mm,cpp}"

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

  # React Native doesn't expose these flags, but not having them
  # can lead to runtime errors due to ABI mismatches.
  # There's also
  #   HERMESVM_PROFILER_OPCODE
  #   HERMESVM_PROFILER_BB
  # which shouldn't be defined in standard setups.
  hermes_debug_hidden_flags = '$(inherited) HERMES_ENABLE_DEBUGGER=1'
  
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
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "GCC_PREPROCESSOR_DEFINITIONS[config=*Debug*]" => hermes_debug_hidden_flags,
    "GCC_PREPROCESSOR_DEFINITIONS[config=*Release*]" => '$(inherited)',
  }
  
end
