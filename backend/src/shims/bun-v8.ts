import v8 from 'node:v8'

// bson 7.3 calls v8.startupSnapshot.isBuildingSnapshot() on import, which Bun 1.3 does not
// implement and throws. Loaded through bunfig.toml preload, so it runs before mongoose or mongodb is imported.
if (typeof Bun !== 'undefined' && v8.startupSnapshot) {
  v8.startupSnapshot.isBuildingSnapshot = () => false
}
