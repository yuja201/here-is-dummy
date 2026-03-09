import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

await flipFuses(require.resolve('electron'), {
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: false
})
