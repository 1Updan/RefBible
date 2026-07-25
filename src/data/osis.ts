const ABBR_MAP: Record<string, string> = {
  Gen: 'GEN', Exod: 'EXOD', Lev: 'LEV', Num: 'NUM', Deut: 'DEUT',
  Josh: 'JOSH', Judg: 'JUDG', Ruth: 'RUTH',
  '1Sam': '1SAM', '2Sam': '2SAM', '1Kgs': '1KGS', '2Kgs': '2KGS',
  '1Chr': '1CHR', '2Chr': '2CHR',
  Ezra: 'EZRA', Neh: 'NEH', Esth: 'ESTH', Job: 'JOB',
  Ps: 'PS', Prov: 'PROV', Eccl: 'ECCL', Song: 'SONG',
  Isa: 'ISA', Jer: 'JER', Lam: 'LAM', Ezek: 'EZEK', Dan: 'DAN',
  Hos: 'HOS', Joel: 'JOEL', Amos: 'AMOS', Obad: 'OBAD',
  Jonah: 'JONAH', Mic: 'MIC', Nah: 'NAH', Hab: 'HAB',
  Zeph: 'ZEPH', Hag: 'HAG', Zech: 'ZECH', Mal: 'MAL',
  Matt: 'MATT', Mark: 'MARK', Luke: 'LUKE', John: 'JHN',
  Acts: 'ACTS', Rom: 'ROM', '1Cor': '1COR', '2Cor': '2COR',
  Gal: 'GAL', Eph: 'EPH', Phil: 'PHIL', Col: 'COL',
  '1Thess': '1THESS', '2Thess': '2THESS',
  '1Tim': '1TIM', '2Tim': '2TIM',
  Titus: 'TITUS', Phlm: 'PHLM', Heb: 'HEB', Jas: 'JAS',
  '1Pet': '1PET', '2Pet': '2PET',
  '1John': '1JHN', '2John': '2JHN', '3John': '3JHN',
  Jude: 'JUDE', Rev: 'REV',
}

export function toOsis(bookAbbr: string): string {
  return ABBR_MAP[bookAbbr] ?? bookAbbr.toUpperCase()
}

// KJV-to-OSIS mapping: database uses KJV format (PSA, MAT, MRK, etc.)
// while ABBR_MAP produces the long OSIS format (PS, MATT, MARK, etc.)
const OSIS_TO_KJV: Record<string, string> = {
  GEN: 'GEN', EXOD: 'EXO', LEV: 'LEV', NUM: 'NUM', DEUT: 'DEU',
  JOSH: 'JOS', JUDG: 'JDG', RUTH: 'RUT',
  '1SAM': '1SA', '2SAM': '2SA', '1KGS': '1KI', '2KGS': '2KI',
  '1CHR': '1CH', '2CHR': '2CH',
  EZRA: 'EZR', NEH: 'NEH', ESTH: 'EST', JOB: 'JOB',
  PS: 'PSA', PROV: 'PRO', ECCL: 'ECC', SONG: 'SNG',
  ISA: 'ISA', JER: 'JER', LAM: 'LAM', EZEK: 'EZK', DAN: 'DAN',
  HOS: 'HOS', JOEL: 'JOL', AMOS: 'AMO', OBAD: 'OBA',
  JONAH: 'JON', MIC: 'MIC', NAH: 'NAM', HAB: 'HAB',
  ZEPH: 'ZEP', HAG: 'HAG', ZECH: 'ZEC', MAL: 'MAL',
  MATT: 'MAT', MARK: 'MRK', LUKE: 'LUK', JHN: 'JHN',
  ACTS: 'ACT', ROM: 'ROM', '1COR': '1CO', '2COR': '2CO',
  GAL: 'GAL', EPH: 'EPH', PHIL: 'PHP', COL: 'COL',
  '1THESS': '1TH', '2THESS': '2TH',
  '1TIM': '1TI', '2TIM': '2TI',
  TITUS: 'TIT', PHLM: 'PHM', HEB: 'HEB', JAS: 'JAS',
  '1PET': '1PE', '2PET': '2PE',
  '1JHN': '1JN', '2JHN': '2JN', '3JHN': '3JN',
  JUDE: 'JUD', REV: 'REV',
}

export function toDbOsis(osis: string): string {
  const parts = osis.split('.')
  const mapped = OSIS_TO_KJV[parts[0]]
  if (mapped) parts[0] = mapped
  return parts.join('.')
}
