// Entry point. See ./clangd-publish/ for the implementation modules and
// scripts/CLANGD.md for what this script does in the larger pipeline.

const { main } = require('./clangd-publish/cli');

process.exit(main(process.argv.slice(2)));
