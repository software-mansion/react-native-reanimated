import groovy.json.JsonSlurper

// Workaround for Android Studio's Gradle Sync failing when CMake's precompiled
// headers (ReanimatedPCH.h) haven't been built yet. See the underlying issue:
// https://issuetracker.google.com/issues/187448826

// Generates minimal stub PCH files from an empty header so the IDE's C++ engine
// doesn't fail during sync. Near-instant unlike the full ReanimatedPCH. The
// actual build regenerates proper PCH files via ninja because we set the stub
// PCH's mtime older than its source.

// Adapted from Expo's PR: https://github.com/expo/expo/pull/39692

val cxxDir = project.file(".cxx")

val generateStubPCHTask = tasks.register("generateStubPCH") {
    dependsOn("configureCMakeDebug")
    doLast {
        if (!cxxDir.exists()) {
            return@doLast
        }
        cxxDir.walkTopDown().forEach { file ->
            if (file.name != "compile_commands.json") {
                return@forEach
            }
            @Suppress("UNCHECKED_CAST")
            val entries = JsonSlurper().parseText(file.readText()) as List<Map<String, Any>>
            entries.forEach entry@{ entry ->
                val entryFile = entry["file"] as String
                if (!entryFile.endsWith("cmake_pch.hxx.cxx")) {
                    return@entry
                }
                val pchFile = File(entryFile.substring(0, entryFile.length - ".cxx".length) + ".pch")
                if (!pchFile.exists() || pchFile.length() == 0L) {
                    val entryDirectory = entry["directory"] as String
                    val stubHeader = File(entryDirectory, "stub_pch.hxx")
                    stubHeader.writeText("")
                    val cmd = (entry["command"] as String)
                        // Replace the forced-include path: `-Xclang -include -Xclang <path>/cmake_pch.hxx`
                        .replace(
                            Regex("""-Xclang -include -Xclang [^\s]+cmake_pch\.hxx(?=\s)"""),
                            "-Xclang -include -Xclang ${stubHeader.absolutePath}",
                        )
                        // Replace the source file operand: `<path>/cmake_pch.hxx.cxx`
                        .replace(Regex("""[^\s]+cmake_pch\.hxx\.cxx"""), stubHeader.absolutePath)
                    // Use a shell to handle the escaped quotes embedded in compile_commands.json
                    // (e.g. `-DLOG_TAG=\"ReactNative\"`); a naive whitespace split would pass the
                    // backslash-quote characters literally to clang and fail compilation.
                    val process = ProcessBuilder("bash", "-c", cmd)
                        .directory(File(entryDirectory))
                        .redirectErrorStream(true)
                        .start()
                    if (process.waitFor() != 0) {
                        throw GradleException(
                            "Stub PCH generation failed: ${process.inputStream.bufferedReader().readText()}",
                        )
                    }
                }
                // Ensure PCH is older than source so ninja rebuilds the real one during build
                pchFile.setLastModified(File(entryFile).lastModified() - 1)
            }
        }
    }
}

// Register `prepareKotlinBuildScriptModel` if absent (Android Studio sync needs it
// to exist so the stub PCH generation runs) or configure it if some other plugin
// already registered it (e.g. on CI, where re-registering throws `Cannot add task
// 'prepareKotlinBuildScriptModel' as a task with that name already exists.`).
if (tasks.findByName("prepareKotlinBuildScriptModel") == null) {
    tasks.register("prepareKotlinBuildScriptModel") {
        dependsOn(generateStubPCHTask)
    }
} else {
    tasks.named("prepareKotlinBuildScriptModel") {
        dependsOn(generateStubPCHTask)
    }
}
