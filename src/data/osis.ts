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
