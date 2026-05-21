import com.android.build.gradle.tasks.ExternalNativeBuildJsonTask

// Attaches a doLast to every ExternalNativeBuildJsonTask in the calling
// project: feeds the iOS xcode-build-server output (.compile) and this
// package's freshly-generated Android CMake DBs into clangd-publish.js,
// which normalizes + merges them into the package-level
// compile_commands.json that clangd reads. See scripts/CLANGD.md.
//
// The caller is responsible for only applying this in monorepo/example-app
// contexts — the script and its helper aren't shipped to npm.

project.tasks.withType<ExternalNativeBuildJsonTask>().configureEach {
    val pkgDir: File = project.projectDir.parentFile
    val cxxRoot = File(project.buildDir.parentFile, ".cxx")
    doLast {
        val repoRoot = pkgDir.parentFile.parentFile
        val publishScript = File(repoRoot, "scripts/clangd-publish.js")
        val output = File(pkgDir, "compile_commands.json")
        val iosCompile = File(repoRoot, "apps/fabric-example/ios/.compile")
        project.exec {
            commandLine(
                "node",
                publishScript.absolutePath,
                output.absolutePath,
                iosCompile.absolutePath,
                cxxRoot.absolutePath,
            )
        }
        logger.lifecycle("Refreshed clangd metadata at $output")
    }
}
