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
    :reanimated_node_modules_dir => nil,
    :react_native_common_dir => nil,
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
  result[:reanimated_node_modules_dir] = File.expand_path(File.join(__dir__, '..', '..'))

  pods_root = Pod::Config.instance.project_pods_root
  react_native_common_dir_absolute = File.join(react_native_node_modules_dir, 'react-native', 'ReactCommon')
  react_native_common_dir_relative = Pathname.new(react_native_common_dir_absolute).relative_path_from(pods_root).to_s
  result[:react_native_common_dir] = react_native_common_dir_relative

  return result
end

def assert_no_multiple_instances(react_native_info)
  if react_native_info[:is_reanimated_example_app]
    return
  end

  lib_instances_in_react_native_node_modules = %x[find #{react_native_info[:react_native_node_modules_dir]} -name "package.json" | grep "/react-native-reanimated/package.json"]
  lib_instances_in_react_native_node_modules_array = lib_instances_in_react_native_node_modules.split("\n")
  lib_instances_in_reanimated_node_modules_array = Array.new
  reanimated_instances = lib_instances_in_react_native_node_modules_array.length()
  if react_native_info[:react_native_node_modules_dir] != react_native_info[:reanimated_node_modules_dir]
    lib_instances_in_reanimated_node_modules = %x[find #{react_native_info[:reanimated_node_modules_dir]} -name "package.json" | grep "/react-native-reanimated/package.json"]
    lib_instances_in_reanimated_node_modules_array = lib_instances_in_reanimated_node_modules.split("\n")
    reanimated_instances += lib_instances_in_reanimated_node_modules_array.length()
  end
  if reanimated_instances > 1
    parsed_location = ''
    for location in lib_instances_in_react_native_node_modules_array + lib_instances_in_reanimated_node_modules_array
      location['/package.json'] = ''
      parsed_location += "- " + location + "\n"
    end
    raise "[Reanimated] Multiple versions of Reanimated were detected (iOS). See https://docs.swmansion.com/react-native-reanimated/docs/guides/Troubleshooting#multiple-versions-of-reanimated-were-detected/ for more information.\n\nConflict between: \n" + parsed_location
  end
end

def assert_latest_react_native_with_new_architecture(config, reanimated_package_json)
  reanimated_version = reanimated_package_json['version']
  reanimated_major_version = reanimated_version.split('.')[0].to_i
  react_native_minor_version = config[:react_native_minor_version]
  fabric_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'
  if fabric_enabled && reanimated_major_version == 3 && react_native_minor_version < 72
    raise "[Reanimated] Outdated version of React Native for New Architecture. Reanimated " + reanimated-version + " supports the New Architecture on React Native 0.72.0+. See https://docs.swmansion.com/react-native-reanimated/docs/guides/Troubleshooting#outdated-version-of-react-native-for-new-architecture for more information."
  end
end

def assert_minimal_react_native_version(config)
  if config[:react_native_minor_version] < 66
    raise "[Reanimated] Unsupported React Native version. Please use 0.66 or newer."
  end
end
