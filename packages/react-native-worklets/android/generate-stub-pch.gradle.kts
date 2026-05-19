import groovy.json.JsonSlurper

// Workaround for Android Studio's C++ analyzer surfacing errors during Gradle
// Sync when CMake's precompiled header binary (`cmake_pch.hxx.pch`, generated
// from `WorkletsPCH.h`) hasn't been built yet. The project compiles fine,
// but on a clean sync the IDE can't index sources without the PCH binary. See
// the underlying issue: https://issuetracker.google.com/issues/187448826

// Generates minimal stub `.pch` files from an empty header so the IDE's C++
// engine doesn't fail during sync. The actual build regenerates the real PCH
// files via ninja because we set each stub PCH's mtime older than its source
// (`cmake_pch.hxx.cxx`).

// Adapted from Expo's PR: https://github.com/expo/expo/pull/45921

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
                    pchFile.parentFile.mkdirs()

                    val command = entry["command"] as String
                    val compiler = command.split(" ").first()
                    val target = Regex("""--target=\S+""").find(command)!!.value
                    val sysroot = Regex("""--sysroot=\S+""").find(command)!!.value

                    val stubHeader = File(pchFile.parentFile, "stub_pch.hxx")
                    stubHeader.writeText("")

                    val process = ProcessBuilder(
                        compiler,
                        target,
                        sysroot,
                        "-x", "c++-header",
                        "-o", pchFile.absolutePath,
                        stubHeader.absolutePath,
                    )
                        .directory(File(entry["directory"] as String))
                        .redirectErrorStream(true)
                        .start()
                    process.outputStream.close()
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
