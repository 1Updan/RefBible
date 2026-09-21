"""Audit KJV hit rate using the same tolerant chain as the app runtime."""
import gzip
import json
import sqlite3
import sys

sys.path.insert(0, 'scripts')
from seed_red_spans import ref_to_verse_id, find_sub  # noqa: E402
from align_red_letters import map_token_span  # noqa: E402

with gzip.open('src-tauri/bundled/refbible.db.gz', 'rb') as f:
    raw = f.read()
open('C:/Users/user/AppData/Local/Temp/audit_bundle.db', 'wb').write(raw)
conn = sqlite3.connect('C:/Users/user/AppData/Local/Temp/audit_bundle.db')
kjv = dict(conn.execute("SELECT verse_id, text_data FROM content_text WHERE translation_code='KJV'"))
conn.close()

kjv_map = json.load(open('src/data/redLetterVerses.json', encoding='utf-8'))['verses']


def runtime_wrap(text, quote):
    """Mirror of TS applyChristWords: exact -> norm -> token map."""
    if quote in text:
        return True
    if find_sub(text, quote) is not None:
        return True
    return map_token_span(quote, text) is not None


full = hit = miss = 0
misses = []
for ref, quote in kjv_map.items():
    vid = ref_to_verse_id(ref)
    text = kjv.get(vid)
    if text is None:
        continue
    if quote == 'full':
        full += 1
    elif runtime_wrap(text, quote):
        hit += 1
    else:
        miss += 1
        misses.append((ref, vid))
print('full:', full, 'partial hit:', hit, 'partial miss:', miss)
print('misses:', misses)
