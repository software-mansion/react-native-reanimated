/* THIS FILE WAS ENTIRELY AI GENERATED. */

project.tasks.configureEach {
    if (!javaClass.name.startsWith("com.android.build.gradle.tasks.ExternalNativeBuildJsonTask")) {
        return@configureEach
    }
    val pkgDir: File = project.projectDir.parentFile
    val cxxRoot = File(project.projectDir, ".cxx")
    doLast {
        val repoRoot = pkgDir.parentFile.parentFile
        val publishScript = File(repoRoot, "scripts/llvm-tools/emit.js")
        val output = File(pkgDir, "compile_commands.json")
        val appsDir = File(repoRoot, "apps")
        val proc = ProcessBuilder(
            "node",
            publishScript.absolutePath,
            output.absolutePath,
            appsDir.absolutePath,
            cxxRoot.absolutePath,
        ).inheritIO().start()
        val exitCode = proc.waitFor()
        if (exitCode != 0) {
            logger.warn("LLVM compile metadata refresh failed with exit $exitCode")
        } else {
            logger.lifecycle("Refreshed LLVM compile metadata at $output")
        }
    }
}
