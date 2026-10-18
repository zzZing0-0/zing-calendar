import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

export function renderServiceWorker(source, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version) || !source.includes('__ZING_RELEASE_VERSION__')) throw new Error('Invalid service-worker release template')
  return source.replaceAll('__ZING_RELEASE_VERSION__', version)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  writeFileSync(path.join(root, 'dist/sw.js'), renderServiceWorker(readFileSync(path.join(root, 'public/sw.js'), 'utf8'), version))
}
