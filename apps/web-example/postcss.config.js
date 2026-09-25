module.exports = {
  plugins: [
    require('react-strict-dom/postcss-plugin')({
      include: [
        '../common-app/src/**/*.{js,jsx,mjs,ts,tsx}',
        '../../node_modules/react-strict-dom/dist/web/*.js',
      ],
    }),
  ],
};
