def worklets_try_to_parse_react_native_package_json(node_modules_dir)
  react_native_package_json_path = File.join(node_modules_dir, 'react-native/package.json')
  if !File.exist?(react_native_package_json_path)
    return nil
  end
  return JSON.parse(File.read(react_native_package_json_path))
end

def worklets_find_config()
  result = {
    :bundle_mode => nil,
    :is_reanimated_example_app => nil,
    :is_tvos_target => nil,
    :react_native_version => nil,
    :react_native_minor_version => nil,
    :react_native_node_modules_dir => nil,
    :react_native_common_dir => nil,
    :dynamic_frameworks_worklets_dir => nil,
  }

  result[:bundle_mode] = ENV["WORKLETS_BUNDLE_MODE"] == "1"

  react_native_node_modules_dir = File.join(File.dirname(`cd "#{Pod::Config.instance.installation_root.to_s}" && node --print "require.resolve('react-native/package.json')"`), '..')
  react_native_json = worklets_try_to_parse_react_native_package_json(react_native_node_modules_dir)

  if react_native_json == nil
    # user configuration, just in case
    node_modules_dir = ENV["REACT_NATIVE_NODE_MODULES_DIR"]
    react_native_json = worklets_try_to_parse_react_native_package_json(node_modules_dir)
  end

  if react_native_json == nil
    raise '[Worklets] Unable to recognize your `react-native` version. Please set environmental variable with `react-native` location: `export REACT_NATIVE_NODE_MODULES_DIR="<path to react-native>" && pod install`.'
  end

  result[:is_reanimated_example_app] = ENV["IS_REANIMATED_EXAMPLE_APP"] != nil
  result[:is_tvos_target] = react_native_json['name'] == 'react-native-tvos'
  result[:react_native_version] = react_native_json['version']
  result[:react_native_minor_version] = react_native_json['version'].split('.')[1].to_i
  if result[:react_native_minor_version] == 0 # nightly
    result[:react_native_minor_version] = 1000
  end
  result[:react_native_node_modules_dir] = File.expand_path(react_native_node_modules_dir)

  pods_root = Pod::Config.instance.project_pods_root
  react_native_common_dir_absolute = File.join(react_native_node_modules_dir, 'react-native', 'ReactCommon')
  react_native_common_dir_relative = Pathname.new(react_native_common_dir_absolute).relative_path_from(pods_root).to_s
  result[:react_native_common_dir] = react_native_common_dir_relative

  react_native_worklets_dir_absolute = File.join(__dir__, '..')
  react_native_worklets_dir_relative = Pathname.new(react_native_worklets_dir_absolute).relative_path_from(pods_root).to_s
  result[:dynamic_frameworks_worklets_dir] = react_native_worklets_dir_relative

  return result
end

def worklets_assert_minimal_react_native_version(config)
  validate_react_native_version_script = File.expand_path(File.join(__dir__, 'validate-react-native-version.js'))
  unless system("node \"#{validate_react_native_version_script}\" #{config[:react_native_version]}")
    raise "[Worklets] React Native version is not compatible with Worklets"
  end
end

def worklets_assert_new_architecture_enabled(new_arch_enabled)
  if !new_arch_enabled
    raise "[Worklets] Worklets require the New Architecture to be enabled. If you have `RCT_NEW_ARCH_ENABLED=0` set in your environment you should remove it."
  end
end

def worklets_get_static_feature_flags()
  feature_flags = {}

  static_feature_flags_path = File.path('./src/featureFlags/staticFlags.json')
  if !File.exist?(static_feature_flags_path)
    raise "[Worklets] Feature flags file not found at #{static_feature_flags_path}."
  end
  static_feature_flags_json = JSON.parse(File.read(static_feature_flags_path))
  static_feature_flags_json.each do |key, value|
    feature_flags[key] = value.to_s
  end

  package_json_path = File.join(Pod::Config.instance.installation_root.to_s, '..', 'package.json')
  if File.exist?(package_json_path)
    package_json = JSON.parse(File.read(package_json_path))
    if package_json['worklets'] && package_json['worklets']['staticFeatureFlags']
      feature_flags_json = package_json['worklets']['staticFeatureFlags']
      feature_flags_json.each do |key, value|
        feature_flags[key] = value.to_s
      end
    end
  end

  return feature_flags.map { |key, value| "[#{key}:#{value}]" }.join('')
end
