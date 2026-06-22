import tarfile, json, os, sys, sqlite3, time, gzip, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from transliterate import transliterate as _transliterate_word

DATA_URL = 'https://raw.githubusercontent.com/tahmmee/interlinear_bibledata/master/interlinear/bible.tar.gz'
HEB_LEX_URL = 'https://raw.githubusercontent.com/tahmmee/interlinear_bibledata/master/lexicon/hebrew.json.gz'
GRK_LEX_URL = 'https://raw.githubusercontent.com/tahmmee/interlinear_bibledata/master/lexicon/greek.json.gz'
BOOKS_URL = 'https://raw.githubusercontent.com/tahmmee/interlinear_bibledata/master/books.json'

BOOK_OSIS = {
    1: 'GEN', 2: 'EXOD', 3: 'LEV', 4: 'NUM', 5: 'DEUT',
    6: 'JOSH', 7: 'JUDG', 8: 'RUTH', 9: '1SAM', 10: '2SAM',
    11: '1KGS', 12: '2KGS', 13: '1CHR', 14: '2CHR', 15: 'EZRA',
    16: 'NEH', 17: 'ESTH', 18: 'JOB', 19: 'PS', 20: 'PROV',
    21: 'ECCL', 22: 'SONG', 23: 'ISA', 24: 'JER', 25: 'LAM',
    26: 'EZEK', 27: 'DAN', 28: 'HOS', 29: 'JOEL', 30: 'AMOS',
    31: 'OBAD', 32: 'JONAH', 33: 'MIC', 34: 'NAH', 35: 'HAB',
    36: 'ZEPH', 37: 'HAG', 38: 'ZECH', 39: 'MAL',
    40: 'MATT', 41: 'MARK', 42: 'LUKE', 43: 'JOHN', 44: 'ACTS',
    45: 'ROM', 46: '1COR', 47: '2COR', 48: 'GAL', 49: 'EPH',
    50: 'PHIL', 51: 'COL', 52: '1THESS', 53: '2THESS', 54: '1TIM',
    55: '2TIM', 56: 'TITUS', 57: 'PHLM', 58: 'HEB', 59: 'JAS',
    60: '1PET', 61: '2PET', 62: '1JOHN', 63: '2JOHN', 64: '3JOHN',
    65: 'JUDE', 66: 'REV',
}

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)
output_dir = os.path.join(project_dir, 'public', 'interlinear-data')
os.makedirs(output_dir, exist_ok=True)

def step(msg):
    print(f'[{time.strftime("%H:%M:%S")}] {msg}')

def download(url, dest):
    if os.path.exists(dest):
        step(f'Using cached {dest}')
        return
    step(f'Downloading {url}...')
    urllib.request.urlretrieve(url, dest)
    step(f'  -> {dest} ({os.path.getsize(dest)} bytes)')

# Step 1: Download tarball
tarball = os.path.join(output_dir, 'bible.tar.gz')
download(DATA_URL, tarball)

# Step 2: Convert interlinear data
step('Converting interlinear data...')
tf = tarfile.open(tarball)
all_ot = []
all_nt = []

for member in tf.getmembers():
    if not member.name.endswith('.json'):
        continue
    data = json.loads(tf.extractfile(member).read().decode('utf-8'))
    for entry in data:
        s = str(entry['id']).zfill(9)
        book = int(s[0:3]); chapter = int(s[3:6]); verse = int(s[6:9])
        osis = BOOK_OSIS.get(book)
        if not osis:
            continue
        verse_id = f'{osis}.{chapter}.{verse}'
        seed_words = []
        for w in entry.get('verse', []):
            strongs = w.get('number', '') or ''
            lang = 'hebrew' if strongs.lower().startswith('h') else 'greek'
            orig = w['word']
            seed_words.append({
                'word_index': w['i'],
                'language': lang,
                'original_text': orig,
                'transliteration': _transliterate_word(lang, orig),
                'strongs_number': strongs.upper() if strongs else None,
                'lemma': None,
                'gloss': w.get('text') or None,
                'morphology': None,
            })
        sv = {'verse_id': verse_id, 'words': seed_words}
        if book <= 39:
            all_ot.append(sv)
        else:
            all_nt.append(sv)

tf.close()

ot_path = os.path.join(output_dir, 'interlinear-ot.json')
with open(ot_path, 'w', encoding='utf-8') as f:
    json.dump(all_ot, f, ensure_ascii=False)
step(f'OT: {len(all_ot)} verses -> {ot_path} ({os.path.getsize(ot_path)/1024/1024:.1f} MB)')

nt_path = os.path.join(output_dir, 'interlinear-nt.json')
with open(nt_path, 'w', encoding='utf-8') as f:
    json.dump(all_nt, f, ensure_ascii=False)
step(f'NT: {len(all_nt)} verses -> {nt_path} ({os.path.getsize(nt_path)/1024/1024:.1f} MB)')

# Step 3: Download and convert Strong's lexicon
heb_lex = os.path.join(output_dir, 'hebrew_lexicon.json.gz')
grk_lex = os.path.join(output_dir, 'greek_lexicon.json.gz')
download(HEB_LEX_URL, heb_lex)
download(GRK_LEX_URL, grk_lex)

step('Converting Strong\'s data...')
all_strongs = []
for lang, path in [('hebrew', heb_lex), ('greek', grk_lex)]:
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        lexicon = json.load(f)
    for entry in lexicon:
        strongs = entry.get('strongs', '')
        if not strongs:
            continue
        definition = None
        if 'data' in entry and 'def' in entry['data']:
            d = entry['data']['def']
            definition = d.get('short', '') or ''
        all_strongs.append({
            'number': strongs.upper(),
            'language': lang,
            'transliteration': entry.get('word') or None,
            'definition': definition,
            'pronunciation': None,
            'word_count': None,
        })

strongs_path = os.path.join(output_dir, 'strongs.json')
with open(strongs_path, 'w', encoding='utf-8') as f:
    json.dump(all_strongs, f, ensure_ascii=False)
step(f'Strongs: {len(all_strongs)} entries -> {strongs_path} ({os.path.getsize(strongs_path)/1024/1024:.1f} MB)')

# Step 4: Optionally seed into SQLite DB
db_paths = [
    os.path.join(project_dir, 'src-tauri', 'refbible.db'),
    os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'com.refbible.app', 'refbible.db'),
]

for db_path in db_paths:
    if not os.path.exists(db_path):
        continue
    step(f'Seeding into {db_path}...')
    conn = sqlite3.connect(db_path)

    conn.execute('DELETE FROM interlinear_words')
    conn.commit()

    CHUNK = 50
    t0 = time.time()
    for name, data in [('OT', all_ot), ('NT', all_nt)]:
        for i in range(0, len(data), CHUNK):
            chunk = data[i:i + CHUNK]
            binds = []
            phs = []
            for verse in chunk:
                for w in verse['words']:
                    idx = len(binds)
                    binds.extend([verse['verse_id'], w['word_index'], w['language'],
                                  w['original_text'], w['transliteration'], w['strongs_number'],
                                  w['lemma'], w['gloss'], w['morphology']])
                    phs.append(f"(?{idx+1},?{idx+2},?{idx+3},?{idx+4},?{idx+5},?{idx+6},?{idx+7},?{idx+8},?{idx+9})")
            if phs:
                conn.execute(f"INSERT OR IGNORE INTO interlinear_words (verse_id, word_index, language, original_text, transliteration, strongs_number, lemma, gloss, morphology) VALUES {','.join(phs)}", binds)
        conn.commit()
        step(f'  {name} seeded ({time.time()-t0:.1f}s)')

    # Seed Strong's
    conn.execute('DELETE FROM strongs_definitions')
    CHUNK = 200
    for i in range(0, len(all_strongs), CHUNK):
        chunk = all_strongs[i:i + CHUNK]
        binds = []
        phs = []
        for j, entry in enumerate(chunk):
            idx = j * 6
            phs.append(f"(?{idx+1},?{idx+2},?{idx+3},?{idx+4},?{idx+5},?{idx+6})")
            binds.extend([entry['number'], entry['language'], entry['transliteration'],
                          entry['definition'], entry['pronunciation'], entry['word_count']])
        conn.execute(f"INSERT OR IGNORE INTO strongs_definitions (number, language, transliteration, definition, pronunciation, word_count) VALUES {','.join(phs)}", binds)
    conn.commit()

    cur = conn.execute("SELECT COUNT(*) FROM interlinear_words")
    wc = cur.fetchone()[0]
    cur = conn.execute("SELECT COUNT(DISTINCT verse_id) FROM interlinear_words")
    vc = cur.fetchone()[0]
    cur = conn.execute("SELECT COUNT(*) FROM strongs_definitions")
    sc = cur.fetchone()[0]
    step(f'  DB: {wc} words in {vc} verses, {sc} Strongs entries')
    conn.close()

step('\nDone!')
