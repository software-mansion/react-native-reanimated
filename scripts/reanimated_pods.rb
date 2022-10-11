def try_to_parse_rn_package_json(node_modules_dir)
  begin
    return JSON.parse(
      File.read(
        File.join(node_modules_dir, 'react-native/package.json')
      )
    )
  rescue
    return nil
  end
end

def find_config()
  result = {
    :is_user_app => true,
    :react_native_version => nil,
    :react_native_minor_version => nil,
    :is_tv_os_target => false,
    :react_native_node_modules_dir => nil,
    :reanimated_node_modules_dir => nil,
    :react_native_common_dir => nil,
  }

  rn_node_modules_dir = File.join(File.dirname(`cd #{Pod::Config.instance.installation_root.to_s} && node --print "require.resolve('react-native/package.json')"`), '..')
  rn_json = try_to_parse_rn_package_json(rn_node_modules_dir)

  if rn_json == nil
    # user configuration, just in case
    node_modules_dir = ENV["RN_LOCATION"]
    rn_json = try_to_parse_rn_package_json(node_modules_dir)
  end

  if ENV["ReanimatedExample"] != nil
    app_name = ENV["ReanimatedExample"]
    result[:is_user_app] = false
  end

  if rn_json == nil
    raise '[RNReanimated] Unable to recognize your `react-native` version! Please set enviromental variable with `react-native` locations: `export RN_LOCATION="<path to react-native>" && pod install'
  end

  result[:is_tv_os_target] = rn_json['name'] == 'react-native-tvos'
  result[:react_native_version] = rn_json['version']
  result[:react_native_minor_version] = rn_json['version'].split('.')[1].to_i
  result[:react_native_node_modules_dir] = rn_node_modules_dir
  result[:reanimated_node_modules_dir] = File.join(__dir__, '..', '..')
  result[:react_native_common_dir] = File.join(rn_node_modules_dir, 'react-native', 'ReactCommon')

  return result
end

def no_multiple_instances_assertion(rn_info)
  if !rn_info[:is_user_app]
    return
  end

  lib_instances_in_rn_node_modules = %x[find #{rn_info[:react_native_node_modules_dir]} -name "package.json" | grep "/react-native-reanimated/package.json"]
  lib_instances_in_rea_node_modules = %x[find #{rn_info[:reanimated_node_modules_dir]} -name "package.json" | grep "/react-native-reanimated/package.json"]
  lib_instances_in_rn_node_modules_array = lib_instances_in_rn_node_modules.split("\n")
  lib_instances_in_rea_node_modules_array = lib_instances_in_rea_node_modules.split("\n")
  rea_instances = lib_instances_in_rn_node_modules_array.length() + lib_instances_in_rea_node_modules_array.length()
  if rea_instances > 1
    parsed_location = ''
    for location in lib_instances_in_rn_node_modules_array + lib_instances_in_rea_node_modules_array
      location['../../'] = '- '
      location['/package.json'] = ''
      parsed_location += "- " + location + "\n"
    end
    raise "[Reanimated] Multiple versions of Reanimated were detected. Only one instance of react-native-reanimated can be installed in a project. You need to resolve the conflict manually. Check out the documentation: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/troubleshooting#multiple-versions-of-reanimated-were-detected \n\nConflict between: \n" + parsed_location
  end
end
