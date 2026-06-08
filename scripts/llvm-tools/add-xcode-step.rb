def add_compile_metadata_step()
  return if ENV['CI'] == 'true' || ENV['GITHUB_ACTIONS']

  generator_script_path = '../../../scripts/llvm-tools/generate-xcode-metadata.sh'

  script_phase :name => 'Generate compile metadata for LLVM tools', :script => generator_script_path, :shell_path => '/bin/bash', :always_out_of_date => 'true', :execution_position => :after_compile
end
