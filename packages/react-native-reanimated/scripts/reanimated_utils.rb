def try_to_parse_react_native_package_json(node_modules_dir)
  react_native_package_json_path = File.join(node_modules_dir, 'react-native/package.json')
  if !File.exist?(react_native_package_json_path)
    return nil
  end
  return JSON.parse(File.read(react_native_package_json_path))
end

def find_config()
  result = {
    :is_reanimated_example_app => nil,
    :react_native_version => nil,
    :react_native_minor_version => nil,
    :is_tvos_target => nil,
    :react_native_node_modules_dir => nil,
    :react_native_common_dir => nil,
    :react_native_reanimated_dir_from_pods_root => nil,
  }

  react_native_node_modules_dir = File.join(File.dirname(`cd "#{Pod::Config.instance.installation_root.to_s}" && node --print "require.resolve('react-native/package.json')"`), '..')
  react_native_json = try_to_parse_react_native_package_json(react_native_node_modules_dir)

  if react_native_json == nil
    # user configuration, just in case
    node_modules_dir = ENV["REACT_NATIVE_NODE_MODULES_DIR"]
    react_native_json = try_to_parse_react_native_package_json(node_modules_dir)
  end

  if react_native_json == nil
    raise '[Reanimated] Unable to recognize your `react-native` version. Please set environmental variable with `react-native` location: `export REACT_NATIVE_NODE_MODULES_DIR="<path to react-native>" && pod install`.'
  end

  result[:is_reanimated_example_app] = ENV["REANIMATED_EXAMPLE_APP_NAME"] != nil
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

  react_native_reanimated_dir_absolute = File.join(__dir__, '..')
  react_native_reanimated_dir_relative = Pathname.new(react_native_reanimated_dir_absolute).relative_path_from(pods_root).to_s
  result[:react_native_reanimated_dir_from_pods_root] = react_native_reanimated_dir_relative

  return result
end

def assert_minimal_react_native_version(config)
      # If you change the minimal React Native version remember to update Compatibility Table in docs
  minimalReactNativeVersion = 75
  if config[:react_native_minor_version] < minimalReactNativeVersion
    raise "[Reanimated] Unsupported React Native version. Please use #{minimalReactNativeVersion} or newer."
  end
end
