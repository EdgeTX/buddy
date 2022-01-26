const wrapper = require("workerloader-jest-transformer/utils/wrapper");

module.exports = {
  async process(src) {
    const wrappedSrc = wrapper.wrapSource((await src).code, "js");
    return wrappedSrc;
  },
};
