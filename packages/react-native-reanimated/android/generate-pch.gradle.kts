import groovy.json.JsonSlurper

// Workaround for Android Studio's Gradle Sync failing when CMake's precompiled
// header (ReanimatedPCH.h) hasn't been built yet. According to
// https://issuetracker.google.com/issues/187448826, the project always compiles
// fine, but during a clean sync the IDE's C++ engine can't index sources because
// the PCH file is missing. Generates the PCH file during sync if it's missing.
// Adapted from Expo's PR: https://github.com/expo/expo/pull/39692
// Differs from the PR by walking the `.cxx` directory to locate each ABI's
// `compile_commands.json` instead of resolving it via
// `ExternalNativeBuildJsonTask.abi.cxxBuildFolder` — the AGP types aren't on
// this applied script's classpath.

val cxxDir = project.file(".cxx")

val generatePCHTask = tasks.register("generatePCH") {
    dependsOn("configureCMakeDebug")
    doLast {
        if (!cxxDir.exists()) {
            return@doLast
        }
        cxxDir.walkTopDown().forEach file@{ file ->
            if (file.name != "compile_commands.json") {
                return@file
            }

            @Suppress("UNCHECKED_CAST")
            val parsedJson = JsonSlurper().parseText(file.readText()) as List<Map<String, Any>>
            parsedJson.forEach entry@{ commandObj ->
                val path = commandObj["file"] as String
                if (!path.endsWith("cmake_pch.hxx.cxx")) {
                    return@entry
                }

                val generatedFilePath = path.substring(0, path.length - ".cxx".length) + ".pch"
                // Skip if the PCH file already exists
                if (File(generatedFilePath).exists()) {
                    return@entry
                }

                val workingDirFile = File(commandObj["directory"] as String)
                val cmd = commandObj["command"] as String
                // Use a shell to handle the escaped quotes embedded in compile_commands.json
                // (e.g. `-DLOG_TAG=\"ReactNative\"`) injected by target_compile_reactnative_options;
                // a naive whitespace split would pass the backslash-quote characters literally
                // to clang and fail compilation.
                providers.exec {
                    workingDir(workingDirFile)
                    commandLine("bash", "-c", cmd)
                }.result.get().assertNormalExitValue()
            }
        }
    }
}

// This task runs on the IDE project sync, ensuring the PCH file is generated early enough
tasks.register("prepareKotlinBuildScriptModel") {
    dependsOn(generatePCHTask)
}
