/**
 * Babel Configuration
 * Transform configuration for Jest and testing
 */

module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
      modules: 'commonjs',
    }],
    ['@babel/preset-typescript', {
      allowDeclareFields: true,
      jsxPragma: 'React',
      jsxPragmaFrag: 'React.Fragment',
    }],
    ['@babel/preset-react', {
      runtime: 'automatic',
    }],
  ],
  plugins: [
    // Add any additional plugins if needed
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current',
          },
          modules: 'commonjs',
        }],
        ['@babel/preset-typescript', {
          allowDeclareFields: true,
          jsxPragma: 'React',
          jsxPragmaFrag: 'React.Fragment',
          allExtensions: true,
          isTSX: true,
        }],
        ['@babel/preset-react', {
          runtime: 'automatic',
        }],
      ],
    },
  },
};