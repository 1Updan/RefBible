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
  { code: 'ELB1905', name: 'Elberfelder Bibel 1905', language: 'de', languageName: 'German', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/de/elb1905/elb1905.json', builtIn: false },
  { code: 'LUTH1912', name: 'Lutherbibel 1912', language: 'de', languageName: 'German', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/de/luth1912/luth1912.json', builtIn: false },
  { code: 'DARBY-FR', name: 'Bible Darby Francaise', language: 'fr', languageName: 'French', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/fr/darby-fr/darby-fr.json', builtIn: false },
  { code: 'LSG', name: 'Louis Segond 1910', language: 'fr', languageName: 'French', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/fr/lsg/lsg.json', builtIn: false },
  { code: 'MARTIN1744', name: 'Bible David Martin 1744', language: 'fr', languageName: 'French', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/fr/martin1744/martin1744.json', builtIn: false },
  { code: 'ALMEIDA-LIVRE', name: 'Almeida 1819 (Biblia Livre)', language: 'pt', languageName: 'Portuguese', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/pt/almeida-livre/almeida-livre.json', builtIn: false },
  { code: 'DIODATI', name: 'Bibbia Diodati 1649', language: 'it', languageName: 'Italian', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/it/diodati/diodati.json', builtIn: false },
  { code: 'RIVEDUTA', name: 'Bibbia Riveduta 1927', language: 'it', languageName: 'Italian', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/it/riveduta/riveduta.json', builtIn: false },
  { code: 'SYNODAL', name: 'Sinodalnyy perevod (Synodal)', language: 'ru', languageName: 'Russian', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/ru/synodal/synodal.json', builtIn: false },
  { code: 'BKR', name: 'Bible kralicka', language: 'cs', languageName: 'Czech', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/cs/bkr/bkr.json', builtIn: false },
  { code: 'DANSK1931', name: 'Dansk 1931', language: 'da', languageName: 'Danish', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/da/dansk1931/dansk1931.json', builtIn: false },
  { code: 'DUTCH1917', name: 'Dutch 1917', language: 'nl', languageName: 'Dutch', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/nl/dutch1917/dutch1917.json', builtIn: false },
  { code: 'LSB', name: 'La Sankta Biblio', language: 'eo', languageName: 'Esperanto', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/eo/lsb/lsb.json', builtIn: false },
  { code: 'KAR', name: 'Karoli Biblia', language: 'hu', languageName: 'Hungarian', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/hu/kar/kar.json', builtIn: false },
  { code: 'BG', name: 'Biblia Gdanska', language: 'pl', languageName: 'Polish', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/pl/bg/bg.json', builtIn: false },
  { code: 'VDC', name: 'Biblia Cornilescu', language: 'ro', languageName: 'Romanian', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/ro/vdc/vdc.json', builtIn: false },
  { code: 'SV1917', name: 'Svenska 1917', language: 'sv', languageName: 'Swedish', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/sv/sv1917/sv1917.json', builtIn: false },
  { code: 'KP', name: 'Kulish-Puliuy (Ukrainian)', language: 'uk', languageName: 'Ukrainian', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/uk/kp/kp.json', builtIn: false },
  { code: 'VI1934', name: 'Vietnamese 1934', language: 'vi', languageName: 'Vietnamese', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/vi/vi1934/vi1934.json', builtIn: false },
  { code: 'SVD', name: 'Smith-Van Dyck (Arabic)', language: 'ar', languageName: 'Arabic', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/ar/svd/svd.json', builtIn: false },
  { code: 'CUV', name: 'Chinese Union (Traditional)', language: 'zh', languageName: 'Chinese', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/zh/cuv/cuv.json', builtIn: false },
  { code: 'CUVS', name: 'Chinese Union (Simplified)', language: 'zh', languageName: 'Chinese', license: 'public-domain', url: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/zh/cuvs/cuvs.json', builtIn: false },
]

export function getVersion(code: string): VersionMeta | undefined {
  return VERSIONS.find((v) => v.code === code)
}

export function getDownloadableVersions(): VersionMeta[] {
  return VERSIONS.filter((v) => !v.builtIn)
}

export const LANGUAGE_NAMES = [...new Set(VERSIONS.map((v) => v.languageName))].sort()

export function getVersionsByLanguage(): Map<string, VersionMeta[]> {
  const map = new Map<string, VersionMeta[]>()
  for (const v of VERSIONS) {
    const list = map.get(v.languageName) ?? []
    list.push(v)
    map.set(v.languageName, list)
  }
  return map
}
