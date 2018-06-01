module.exports = {
  parser: "babel-eslint",
  extends: "standard",
  extends: [
    "prettier",
    "prettier/flowtype",
    "prettier/react",
    "prettier/standard"
  ],
  plugins: ["import"],
  rules: {
    "import/no-unresolved": 2
  }
};
