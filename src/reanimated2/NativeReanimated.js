let reanimatedJS;
if(process.env.JEST_WORKER_ID) {
  reanimatedJS = require('./js-reanimated/index.web').default
} else {
  reanimatedJS = require('./js-reanimated/index')
}
export default reanimatedJS;
