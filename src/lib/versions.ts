export interface VersionMeta {
  code: string
  name: string
  language: string
  languageName: string
  license: string
  url: string
  builtIn: boolean
}

export const VERSIONS: VersionMeta[] = [
  { code: 'KJV', name: 'King James Version', language: 'en', languageName: 'English', license: 'public-domain', url: '', builtIn: true },
  { code: 'NASB', name: 'New American Standard Bible', language: 'en', languageName: 'English', license: 'fair-use', url: '', builtIn: true },
  { code: 'ASV', name: 'American Standard Version', language: 'en', languageName: 'English', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/asv/asv.json', builtIn: false },
  { code: 'DRA', name: 'Douay-Rheims American Edition', language: 'en', languageName: 'English', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/dra/dra.json', builtIn: false },
  { code: 'GENEVA1599', name: 'Geneva Bible 1599', language: 'en', languageName: 'English', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/geneva1599/geneva1599.json', builtIn: false },
  { code: 'WEB', name: 'World English Bible', language: 'en', languageName: 'English', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/web/web.json', builtIn: false },
]

export function getVersion(code: string): VersionMeta | undefined {
  return VERSIONS.find((v) => v.code === code)
}

export function getVersionsByLanguage(): Map<string, VersionMeta[]> {
  const map = new Map<string, VersionMeta[]>()
  for (const v of VERSIONS) {
    const list = map.get(v.languageName) ?? []
    list.push(v)
    map.set(v.languageName, list)
  }
  return map
}
