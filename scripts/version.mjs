import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

export function syncVersion(root, next) {
  const manifestPath = path.join(root, 'package.json')
  const lockPath = path.join(root, 'package-lock.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  if (next !== undefined) {
    if (!/^\d+\.\d+\.\d+$/.test(next)) throw new Error('Use a numeric major.minor.patch version')
    const before = manifest.version.split('.').map(Number), after = next.split('.').map(Number)
    const first = after.findIndex((value, index) => value !== before[index])
    if (first < 0 || after[first] < before[first]) throw new Error('Every code delivery must use a strictly newer version')
    manifest.version = next
    lock.version = next
    lock.packages[''].version = next
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n')
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || lock.version !== manifest.version || lock.packages?.['']?.version !== manifest.version) throw new Error('Package and lockfile release versions disagree')
  return manifest.version
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const argument = process.argv[2]
  console.log(syncVersion(root, argument === '--check' ? undefined : argument))
}
