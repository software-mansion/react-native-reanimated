import com.android.build.gradle.tasks.ExternalNativeBuildJsonTask

// Attaches a doLast to every ExternalNativeBuildJsonTask in the calling
// project: merges the iOS DB (apps/fabric-example/ios/compile_commands.json)
// with this package's freshly-generated Android CMake DBs and rewrites the
// package-level compile_commands.json for clangd. See scripts/CLANGD.md.
//
// The caller is responsible for only applying this in monorepo/example-app
// contexts — the script and its companion .js helpers don't ship to npm.

project.tasks.withType<ExternalNativeBuildJsonTask>().configureEach {
    val pkgDir: File = project.projectDir.parentFile
    val cxxRoot = File(project.buildDir.parentFile, ".cxx")
    doLast {
        val repoRoot = pkgDir.parentFile.parentFile
        val mergeScript = File(repoRoot, "scripts/clangd-merge-compile-commands.js")
        val output = File(pkgDir, "compile_commands.json")
        val iosDb = File(repoRoot, "apps/fabric-example/ios/compile_commands.json")
        project.exec {
            commandLine(
                "node",
                mergeScript.absolutePath,
                output.absolutePath,
                iosDb.absolutePath,
                cxxRoot.absolutePath,
            )
        }
        logger.info("Refreshed clangd metadata at $output")
    }
}
