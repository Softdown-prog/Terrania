// Phaser 3 publishes an ESM build with the same namespace as its bundled types.
declare module 'phaser/dist/phaser.esm.js' {
  import Phaser from 'phaser';
  export = Phaser;
}
