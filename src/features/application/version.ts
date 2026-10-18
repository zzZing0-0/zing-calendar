import packageInfo from '../../../package.json'

/** package.json is the only release-version source, also used by builds and tags. */
export const APP_VERSION = packageInfo.version
