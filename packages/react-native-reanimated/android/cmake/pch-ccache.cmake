# Lets ccache share the compile results of sources that use a precompiled header between checkouts
# at different paths (for example jj workspaces or git worktrees).
# Adapted from Expo's pch-ccache.cmake: https://github.com/expo/expo/pull/50982
# Script mode: the custom command added by pch_ccache_precompile_headers runs this file to write the .sum.
if(CMAKE_SCRIPT_MODE_FILE)
  set(target_option)
  if(COMPILER_TARGET)
    set(target_option "--target=${COMPILER_TARGET}")
  endif()

  execute_process(
    COMMAND "${COMPILER}" ${target_option} -module-file-info "${PCH}"
    OUTPUT_VARIABLE info
    RESULT_VARIABLE result
  )

  if(NOT result EQUAL 0)
    # Hash the .pch itself, which is what ccache does without a .sum. The build stays correct, but
    # checkouts at different paths don't share the results of the users of this PCH.
    message(WARNING "`${COMPILER} -module-file-info ${PCH}` failed, so ccache can't share the results "
      "of the users of this PCH between checkouts at different paths.")
    file(SHA256 "${PCH}" digest)
    file(WRITE "${PCH}.sum" "${digest}\n")
    return()
  endif()

  # These differ between checkouts and builds without changing what the PCH contains.
  string(REGEX REPLACE "PCH_CCACHE_BUILD_DIR=[^\n]*|ShowColors: [^\n]*" "" info "${info}")

  string(REGEX MATCHALL "Input file: [^\n]*" input_files "${info}")
  foreach(input_file IN LISTS input_files)
    string(REGEX REPLACE "^Input file: | \\[[A-Za-z, ]+\\]$" "" path "${input_file}")
    if(EXISTS "${path}")
      file(SHA256 "${path}" digest)
      string(APPEND info "${digest}\n")
    endif()
  endforeach()

  if(BASE_DIR)
    string(REGEX REPLACE "(.)/+$" "\\1" base_dir "${BASE_DIR}")
    string(REGEX REPLACE "([][+.*()^$?|\\\\])" "\\\\\\1" base_dir_regex "${base_dir}")
    # The directory itself or a path in it, followed by a space, a quote or a line break. A directory whose
    # name only starts with the same text doesn't match.
    string(REGEX MATCHALL "${base_dir_regex}(/[^ '\n]*)?[ '\n]" paths "${info}")
    list(REMOVE_DUPLICATES paths)
    foreach(path IN LISTS paths)
      string(REGEX REPLACE "[ '\n]$" "" path "${path}")
      file(RELATIVE_PATH relative_path "${BUILD_DIR}" "${path}")
      string(REGEX REPLACE "([][+.*()^$?|\\\\])" "\\\\\\1" path_regex "${path}")
      string(REGEX REPLACE "${path_regex}([ '\n])" "${relative_path}\\1" info "${info}")
    endforeach()
  endif()

  string(SHA256 digest "${info}")
  file(WRITE "${PCH}.sum" "${digest}\n")
  return()
endif()

set(PCH_CCACHE_FILE "${CMAKE_CURRENT_LIST_FILE}")

function(_pch_ccache_program target out_var)
  get_target_property(launcher ${target} CXX_COMPILER_LAUNCHER)
  get_property(global_rule GLOBAL PROPERTY RULE_LAUNCH_COMPILE)
  get_property(directory_rule DIRECTORY PROPERTY RULE_LAUNCH_COMPILE)
  separate_arguments(rules UNIX_COMMAND "${global_rule} ${directory_rule}")
  get_filename_component(compiler "${CMAKE_CXX_COMPILER}" REALPATH)
  foreach(program IN LISTS launcher rules compiler)
    get_filename_component(name "${program}" NAME_WE)
    if(name STREQUAL "ccache")
      find_program(PCH_CCACHE_PROGRAM NAMES "${program}")
      set(${out_var} "${PCH_CCACHE_PROGRAM}" PARENT_SCOPE)
      return()
    endif()
  endforeach()
  set(${out_var} "" PARENT_SCOPE)
endfunction()

# Sets <pch_external_checksum_var> and <base_dir_var> to the ccache configuration of <target>.
function(_pch_ccache_config target pch_external_checksum_var base_dir_var)
  set(pch_external_checksum "")
  set(base_dir "")
  _pch_ccache_program(${target} ccache)
  if(NOT ccache AND "$ENV{PCH_CCACHE_FORCE_SUM}")
    # ccache runs through a wrapper, so take its configuration from the ccache on PATH
    find_program(PCH_CCACHE_PATH_PROGRAM ccache)
    set(ccache "${PCH_CCACHE_PATH_PROGRAM}")
  endif()
  if(ccache)
    foreach(option IN ITEMS pch_external_checksum base_dir)
      execute_process(
        COMMAND "${ccache}" --get-config ${option}
        OUTPUT_VARIABLE ${option}
        OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_QUIET
      )
    endforeach()
  endif()

  if("$ENV{PCH_CCACHE_FORCE_SUM}")
    set(pch_external_checksum "true")
  endif()
  set(${pch_external_checksum_var} "${pch_external_checksum}" PARENT_SCOPE)
  set(${base_dir_var} "${base_dir}" PARENT_SCOPE)
endfunction()

# Precompiles <header> for <target>. When ccache hashes a .sum instead of the PCH
# (`pch_external_checksum`), the PCH is built in a separate <target>-pch object library, as Expo does
# with expo-modules-pch: a target can't wait for the .sum of a PCH it builds itself. The owner gets
# <target>'s compile options, definitions, include directories and link libraries, and <target>
# reuses its PCH. Otherwise this is target_precompile_headers(<target> PRIVATE <header>).
function(pch_ccache_precompile_headers target header)
  set(owner ${target}-pch)
  # CMake's location of the PCH for the Ninja and Makefile generators.
  set(pch_dir "${CMAKE_CURRENT_BINARY_DIR}/CMakeFiles/${owner}.dir")
  set(pch "${pch_dir}/cmake_pch.hxx.pch")

  _pch_ccache_config(${target} pch_external_checksum base_dir)
  if(CMAKE_DISABLE_PRECOMPILE_HEADERS OR NOT pch_external_checksum STREQUAL "true")
    # Remove the .sum of an earlier configuration: it can belong to an older PCH, and ccache would hash it
    # if `pch_external_checksum` is enabled later.
    file(REMOVE "${pch}.sum")
    target_precompile_headers(${target} PRIVATE "${header}")
    return()
  endif()

  set(owner_source "${CMAKE_CURRENT_BINARY_DIR}/${owner}.cpp")
  if(NOT EXISTS "${owner_source}")
    file(WRITE "${owner_source}" "")
  endif()
  add_library(${owner} OBJECT "${owner_source}")
  target_compile_options(${owner} PRIVATE $<TARGET_PROPERTY:${target},COMPILE_OPTIONS>)
  target_compile_definitions(${owner} PRIVATE $<TARGET_PROPERTY:${target},COMPILE_DEFINITIONS>)
  target_include_directories(${owner} PRIVATE $<TARGET_PROPERTY:${target},INCLUDE_DIRECTORIES>)
  target_link_libraries(${owner} PRIVATE $<TARGET_PROPERTY:${target},LINK_LIBRARIES>)
  # Included by name, not by path, so CMake's cmake_pch.hxx is the same in every checkout and ccache can
  # share the results of the sources that use it.
  get_filename_component(header_name "${header}" NAME)
  target_precompile_headers(${owner} PRIVATE "<${header_name}>")
  target_precompile_headers(${target} REUSE_FROM ${owner})

  # Makes the PCH compile itself checkout-specific in ccache: a .pch records the absolute paths of its
  # inputs, so a PCH restored from another checkout breaks once that checkout is gone.
  set_property(SOURCE "${pch_dir}/cmake_pch.hxx.cxx" APPEND PROPERTY
    COMPILE_DEFINITIONS "PCH_CCACHE_BUILD_DIR=${CMAKE_CURRENT_BINARY_DIR}"
  )

  add_custom_command(
    OUTPUT "${pch}.sum"
    COMMAND "${CMAKE_COMMAND}"
      "-DCOMPILER=${CMAKE_CXX_COMPILER}"
      "-DCOMPILER_TARGET=${CMAKE_CXX_COMPILER_TARGET}"
      "-DPCH=${pch}"
      "-DBASE_DIR=${base_dir}"
      "-DBUILD_DIR=${CMAKE_BINARY_DIR}"
      -P "${PCH_CCACHE_FILE}"
    DEPENDS "${pch}" "${PCH_CCACHE_FILE}"
    COMMENT "Writing the ccache checksum of the ${owner} PCH"
    VERBATIM
  )
  add_custom_target(${owner}-pch-ccache-sum DEPENDS "${pch}.sum")
  # ccache reads the .sum when it compiles a source of <target>, so it must be written before.
  add_dependencies(${target} ${owner}-pch-ccache-sum)
endfunction()
