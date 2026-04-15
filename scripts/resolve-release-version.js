const { getVersion } = require('./releasing');

if (require.main === module) {
  const version = getVersion(process.argv);

  // Intentional, this is consumed by the action
  console.log(version.newVersion);
}
