def add_clangd_generation_step()
  generator_script_path = '../../../packages/react-native-reanimated/scripts/clangd-generate-xcode-metadata.sh'

  script_phase :name => 'Generate metadata for clangd', :script => generator_script_path, :shell_path => '/bin/bash', :always_out_of_date => 'true', :execution_position => :after_compile
end