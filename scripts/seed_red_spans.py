"""Seed per-translation red-letter spans (Words of Christ).

Sources (all public domain):
  KJV quotes : src/data/redLetterVerses.json (2007 refs, full | exact quote)
  WEB exact  : eBible eng-web USFM (\\wj markers) -- set WEB_USFM_DIR
  Target text: midvash bible-data JSONs (same files the app downloader uses)

Usage:
  python scripts/seed_red_spans.py --tmp C:/Users/user/AppData/Local/Temp --out src/data

Outputs per translation:
  src/data/redSpans.{web,asv,dra,geneva1599}.json
    { "verses": { "MAT.5.3": {"spans": [[s,e]], "hash": sha1, "conf": 1.0, "method": ...} } }
  scripts/red-letter-report-{code}.md

No Bible text is committed -- only offsets, hashes and reports.
"""
import argparse
import glob
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from align_red_letters import align_quote, map_token_span, AUTO_ACCEPT, REVIEW_FLOOR  # noqa: E402

KJV_BOOKS = [
    ('GEN', 'GEN'), ('EXO', 'EXOD'), ('LEV', 'LEV'), ('NUM', 'NUM'), ('DEU', 'DEUT'),
    ('JOS', 'JOSH'), ('JDG', 'JUDG'), ('RUT', 'RUTH'), ('1SA', '1SAM'), ('2SA', '2SAM'),
    ('1KI', '1KGS'), ('2KI', '2KGS'), ('1CH', '1CHR'), ('2CH', '2CHR'), ('EZR', 'EZRA'),
    ('NEH', 'NEH'), ('EST', 'ESTH'), ('JOB', 'JOB'), ('PSA', 'PS'), ('PRO', 'PROV'),
    ('ECC', 'ECCL'), ('SNG', 'SONG'), ('ISA', 'ISA'), ('JER', 'JER'), ('LAM', 'LAM'),
    ('EZK', 'EZEK'), ('DAN', 'DAN'), ('HOS', 'HOS'), ('JOL', 'JOEL'), ('AMO', 'AMOS'),
    ('OBA', 'OBAD'), ('JON', 'JONAH'), ('MIC', 'MIC'), ('NAM', 'NAH'), ('HAB', 'HAB'),
    ('ZEP', 'ZEPH'), ('HAG', 'HAG'), ('ZEC', 'ZECH'), ('MAL', 'MAL'),
    ('MAT', 'MATT'), ('MRK', 'MARK'), ('LUK', 'LUKE'), ('JHN', 'JHN'), ('ACT', 'ACTS'),
    ('ROM', 'ROM'), ('1CO', '1COR'), ('2CO', '2COR'), ('GAL', 'GAL'), ('EPH', 'EPH'),
    ('PHP', 'PHIL'), ('COL', 'COL'), ('1TH', '1THESS'), ('2TH', '2THESS'), ('1TI', '1TIM'),
    ('2TI', '2TIM'), ('TIT', 'TITUS'), ('PHM', 'PHLM'), ('HEB', 'HEB'), ('JAS', 'JAS'),
    ('1PE', '1PET'), ('2PE', '2PET'), ('1JN', '1JHN'), ('2JN', '2JHN'), ('3JN', '3JHN'),
    ('JUD', 'JUDE'), ('REV', 'REV'),
]
BOOK_CODE_TO_KJV = {}
for kjv, osis in KJV_BOOKS:
    BOOK_CODE_TO_KJV[kjv] = kjv
    BOOK_CODE_TO_KJV[osis] = kjv
FULL_NAMES = {
    'GENESIS': 'GEN', 'EXODUS': 'EXO', 'LEVITICUS': 'LEV', 'NUMBERS': 'NUM',
    'DEUTERONOMY': 'DEU', 'JOSHUA': 'JOS', 'JUDGES': 'JDG', 'RUTH': 'RUT',
    '1SAMUEL': '1SA', '2SAMUEL': '2SA', '1KINGS': '1KI', '2KINGS': '2KI',
    '1CHRONICLES': '1CH', '2CHRONICLES': '2CH', 'EZRA': 'EZR', 'NEHEMIAH': 'NEH',
    'ESTHER': 'EST', 'JOB': 'JOB', 'PSALMS': 'PSA', 'PSALM': 'PSA', 'PROVERBS': 'PRO',
    'ECCLESIASTES': 'ECC', 'SONGOFSONGS': 'SNG', 'SONGOFSOLOMON': 'SNG',
    'ISAIAH': 'ISA', 'JEREMIAH': 'JER', 'LAMENTATIONS': 'LAM', 'EZEKIEL': 'EZK',
    'DANIEL': 'DAN', 'HOSEA': 'HOS', 'JOEL': 'JOL', 'AMOS': 'AMO', 'OBADIAH': 'OBA',
    'JONAH': 'JON', 'MICAH': 'MIC', 'NAHUM': 'NAM', 'HABAKKUK': 'HAB',
    'ZEPHANIAH': 'ZEP', 'HAGGAI': 'HAG', 'ZECHARIAH': 'ZEC', 'MALACHI': 'MAL',
    'MATTHEW': 'MAT', 'MARK': 'MRK', 'LUKE': 'LUK', 'JOHN': 'JHN', 'ACTS': 'ACT',
    'ROMANS': 'ROM', '1CORINTHIANS': '1CO', '2CORINTHIANS': '2CO',
    'GALATIANS': 'GAL', 'EPHESIANS': 'EPH', 'PHILIPPIANS': 'PHP', 'COLOSSIANS': 'COL',
    '1THESSALONIANS': '1TH', '2THESSALONIANS': '2TH',
    '1TIMOTHY': '1TI', '2TIMOTHY': '2TI', 'TITUS': 'TIT', 'PHILEMON': 'PHM',
    'HEBREWS': 'HEB', 'JAMES': 'JAS', '1PETER': '1PE', '2PETER': '2PE',
    '1JOHN': '1JN', '2JOHN': '2JN', '3JOHN': '3JN', 'JUDE': 'JUD',
    'REVELATION': 'REV', 'REVELATIONS': 'REV',
}
BOOK_CODE_TO_KJV.update(FULL_NAMES)


def sha1(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()


# Stored hash length (hex chars). Change-detection only, not security --
# keeps the bundled JSON small while catching text drift.
HASH_LEN = 12


_QUOTE_MAP = str.maketrans({
    '\u201c': '"', '\u201d': '"', '\u2018': "'", '\u2019': "'",
    '\u2014': '-', '\u2013': '-', '\u00a0': ' ',
})


def norm_quotes(s):
    """1:1 char mapping (length-preserving), so offsets stay valid."""
    return s.translate(_QUOTE_MAP)


def find_sub(text, sub):
    """Locate sub in text: exact first, then quote-normalized. Returns
    [start, end] in text coordinates or None."""
    if sub and sub in text:
        pos = text.find(sub)
        return [pos, pos + len(sub)]
    ntext, nsub = norm_quotes(text), norm_quotes(sub)
    if nsub and nsub in ntext:
        pos = ntext.find(nsub)
        return [pos, pos + len(nsub)]
    return None


def ref_to_verse_id(ref):
    """'Matthew 5:3' -> 'MAT.5.3' (None when unparseable)."""
    try:
        left, v = ref.rsplit(':', 1)
        book_name, ch = left.rsplit(' ', 1)
        key = book_name.upper().replace(' ', '')
        kjv = BOOK_CODE_TO_KJV.get(key)
        if not kjv:
            return None
        return '%s.%d.%d' % (kjv, int(ch), int(v))
    except (ValueError, TypeError):
        return None


def load_midvash(path):
    """midvash JSON -> {verse_id: text} with KJV-code verse IDs."""
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    out = {}
    skipped = 0
    for book in data['books']:
        kjv = BOOK_CODE_TO_KJV.get(str(book.get('book', '')).upper())
        if not kjv:
            skipped += 1
            continue
        for ch in book['chapters']:
            for v in ch['verses']:
                out['%s.%d.%d' % (kjv, ch['chapter'], v['number'])] = v['text']
    return out, skipped


MARKER_RE = re.compile(r'\\(\+?[A-Za-z0-9]+)(\*?)')


def parse_usfm_wj(usfm_dir):
    """Parse eBible USFM dir -> {verse_id: [(s, e)]} spans in verse-text space,
    plus {verse_id: plain_text}. Cross-verse \\wj spans split at boundaries."""
    verses = {}
    texts = {}
    for path in sorted(glob.glob(os.path.join(usfm_dir, '*.usfm'))):
        with open(path, encoding='utf-8-sig') as f:
            content = f.read()
        book = None
        chapter = 0
        verse = 0
        buf = []        # plain-text chars of current verse
        spans = []      # wj intervals in buf space
        wj_depth = 0
        wj_start = 0
        in_footnote = 0
        in_word = False

        def flush():
            if verse:
                vid = '%s.%d.%d' % (book, chapter, verse)
                verses.setdefault(vid, []).extend(spans)
                texts[vid] = ''.join(buf)

        tokens = re.split(r'(\\\+?[A-Za-z0-9]+\*?)', content)
        i = 0
        while i < len(tokens):
            tok = tokens[i]
            m = re.match(r'^\\(\+?[A-Za-z0-9]+)(\*?)$', tok or '')
            if m:
                marker, star = m.group(1), m.group(2)
                base = marker.lstrip('+')
                if base == 'id' and not star:
                    arg = tokens[i + 1] if i + 1 < len(tokens) else ''
                    code = (re.search(r'\b([A-Za-z0-9]{3})\b', arg) or (None,))[0]
                    code = (code or '').upper()
                    book = BOOK_CODE_TO_KJV.get(code, code)
                elif base == 'c' and not star:
                    flush()
                    verse = 0
                    try:
                        chapter = int((tokens[i + 1] if i + 1 < len(tokens) else '').strip().split()[0])
                    except ValueError:
                        chapter = 0
                elif base == 'v' and not star:
                    flush()
                    buf, spans = [], []
                    try:
                        verse = int((tokens[i + 1] if i + 1 < len(tokens) else '').strip().split()[0].split('-')[0])
                    except ValueError:
                        verse = 0
                    wj_depth = 0
                    in_word = False
                elif base == 'wj' and not star:
                    if wj_depth == 0:
                        wj_start = len(buf)
                    wj_depth += 1
                elif base == 'wj' and star:
                    wj_depth = max(0, wj_depth - 1)
                    if wj_depth == 0 and len(buf) > wj_start:
                        spans.append((wj_start, len(buf)))
                elif base in ('f', 'x') and not star:
                    in_footnote += 1
                elif base in ('f', 'x') and star:
                    in_footnote = max(0, in_footnote - 1)
                elif base == 'w' and not star:
                    in_word = True
                elif base == 'w' and star:
                    in_word = False
                # Only id/c/v consume the following token as an argument.
                # All other markers (w, wj, p, q, add, f, ...) leave the
                # next token in place so verse text is never skipped.
                if base in ('id', 'c', 'v') and not star:
                    i += 2
                else:
                    i += 1
                continue
            if in_footnote == 0 and verse and tok:
                # collapse internal newlines to spaces (USFM poetry lines)
                cleaned = re.sub(r'\s+', ' ', tok)
                # word markers carry attributes: \w word|strong="G.."\w*
                if in_word:
                    cleaned = cleaned.split('|')[0]
                # drop stray control characters present in the source
                cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', cleaned)
                buf.extend(cleaned)
            i += 1
        flush()
    # normalize whitespace in texts and shift spans accordingly
    norm_texts, norm_spans = {}, {}
    for vid, text in texts.items():
        parts = re.split(r'(\s+)', text)
        out_chars = []
        mapping = []  # old index -> new index
        for part in parts:
            if part.strip():
                for ch in part:
                    mapping.append(len(out_chars))
                    out_chars.append(ch)
            else:
                if out_chars and not out_chars[-1] == ' ':
                    # record gap: old indices in whitespace map to current len
                    pass
                out_chars.append(' ')
                mapping.append(len(out_chars) - 1)
        norm = ''.join(out_chars).strip()
        # rebuild mapping properly: walk old text
        norm_texts[vid] = ' '.join(text.split())
        new_spans = []
        for s, e in verses.get(vid, []):
            sub = text[s:e]
            nsub = ' '.join(sub.split())
            if not nsub:
                continue
            pos = norm_texts[vid].find(nsub)
            if pos != -1:
                # trim boundary whitespace so substrings match target texts
                lead = len(nsub) - len(nsub.lstrip())
                trail = len(nsub) - len(nsub.rstrip())
                new_spans.append([pos + lead, pos + len(nsub) - trail])
        if new_spans:
            norm_spans[vid] = new_spans
    return norm_spans, norm_texts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tmp', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--repo', required=True)
    args = ap.parse_args()

    with open(os.path.join(args.repo, 'src/data/redLetterVerses.json'), encoding='utf-8') as f:
        kjv_map = json.load(f)['verses']
    print('KJV refs: %d' % len(kjv_map))

    targets = {
        'web': 'midvash-web.json',
        'asv': 'midvash-asv.json',
        'dra': 'midvash-dra.json',
        'geneva1599': 'midvash-geneva.json',
    }
    texts = {}
    for code, fname in targets.items():
        t, skipped = load_midvash(os.path.join(args.tmp, fname))
        texts[code] = t
        print('%s verses: %d (skipped books: %d)' % (code, len(t), skipped))

    # WEB exact spans from eBible USFM
    web_spans, web_texts = parse_usfm_wj(os.path.join(args.tmp, 'eng-web_usfm'))
    print('WEB USFM verses with wj spans: %d' % len(web_spans))

    # map KJV refs -> verse ids once
    ref_ids = {}
    unparsed = 0
    for ref in kjv_map:
        vid = ref_to_verse_id(ref)
        if vid is None:
            unparsed += 1
        else:
            ref_ids[ref] = vid
    print('unparsed KJV refs: %d' % unparsed)

    for code in targets:
        t = texts[code]
        out = {}
        stats = {'full': 0, 'exact': 0, 'high': 0, 'review': 0, 'gap': 0, 'missing_verse': 0}
        review_rows = []
        for ref, quote in kjv_map.items():
            vid = ref_ids.get(ref)
            if vid is None:
                continue
            text = t.get(vid)
            if text is None:
                stats['missing_verse'] += 1
                continue
            h = sha1(text)
            if quote == 'full':
                out[vid] = {'spans': [[0, len(text)]], 'hash': h[:HASH_LEN], 'conf': 1.0, 'method': 'full'}
                stats['full'] += 1
                continue
            span = None
            conf = 0.0
            method = 'gap'
            if code == 'web':
                # exact: eBible wj substrings mapped onto midvash text.
                # 1) raw/normalized substring, 2) token-level mapping
                # (immune to quote-spacing differences between editions).
                mapped = False
                for s, e in web_spans.get(vid, []):
                    sub = web_texts[vid][s:e]
                    span = find_sub(text, sub)
                    if span is None:
                        span = map_token_span(sub, text)
                    if span is not None:
                        out[vid] = {'spans': [span], 'hash': h[:HASH_LEN], 'conf': 1.0, 'method': 'web-wj-exact'}
                        stats['exact'] += 1
                        mapped = True
                        break
                if mapped:
                    continue
            s, score, flag = align_quote(quote, text)
            if flag in ('exact', 'high'):
                out[vid] = {'spans': [list(s)], 'hash': h[:HASH_LEN], 'conf': score, 'method': 'align-' + flag}
                stats['high' if flag == 'high' else 'exact'] += 1
            elif flag == 'review':
                stats['review'] += 1
                review_rows.append((ref, vid, quote, text[s[0]:s[1]] if s else '', score))
            else:
                stats['gap'] += 1
        with open(os.path.join(args.out, 'redSpans.%s.json' % code), 'w', encoding='utf-8') as f:
            json.dump({'verses': out}, f, ensure_ascii=False)
        with open(os.path.join(args.repo, 'scripts/red-letter-report-%s.md' % code), 'w', encoding='utf-8') as f:
            f.write('# Red-letter report: %s\n\n' % code)
            f.write('Verses with spans: %d / %d KJV refs\n\n' % (len(out), len(kjv_map)))
            f.write('| bucket | count |\n|---|---|\n')
            for k in ('full', 'exact', 'high', 'review', 'gap', 'missing_verse'):
                f.write('| %s | %d |\n' % (k, stats[k]))
            f.write('\n## Review queue (renders plain in v1): %d\n\n' % len(review_rows))
            for ref, vid, quote, got, score in review_rows[:200]:
                f.write('### %s (%s) score=%s\n- KJV quote: %s\n- candidate: %s\n\n' % (ref, vid, score, quote, got))
        print('%s -> spans: %d %s' % (code, len(out), stats))


if __name__ == '__main__':
    main()
