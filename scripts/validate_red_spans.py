"""Validate generated redSpans JSONs against midvash target texts."""
import hashlib
import json
import sys

sys.path.insert(0, 'scripts')
from seed_red_spans import load_midvash  # noqa: E402

TMP = 'C:/Users/user/AppData/Local/Temp'
FILES = {
    'web': 'midvash-web.json',
    'asv': 'midvash-asv.json',
    'dra': 'midvash-dra.json',
    'geneva1599': 'midvash-geneva.json',
}
ok = True
for code, fname in FILES.items():
    texts, _ = load_midvash(TMP + '/' + fname)
    data = json.load(open('src/data/redSpans.%s.json' % code, encoding='utf-8'))['verses']
    bad = 0
    for vid, row in data.items():
        text = texts.get(vid)
        if text is None:
            print('MISSING TEXT', code, vid)
            bad += 1
            continue
        if hashlib.sha1(text.encode()).hexdigest()[:12] != row['hash']:
            print('HASH MISMATCH', code, vid)
            bad += 1
        for s, e in row['spans']:
            if not (0 <= s < e <= len(text)) or not text[s:e].strip():
                print('BAD SPAN', code, vid, s, e)
                bad += 1
    print(code, 'entries:', len(data), 'problems:', bad)
    ok = ok and bad == 0
print('VALID' if ok else 'INVALID')
