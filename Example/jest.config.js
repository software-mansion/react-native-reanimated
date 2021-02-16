module.exports = {
    preset: "react-native",
    setupFiles: ['./jest-setup.js'],
    setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
}