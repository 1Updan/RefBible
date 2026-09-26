"""Build shippable v4 artifacts: slim first-run DB + NASB pack + study pack.

Outputs (into --out dir):
  refbible-slim.db.gz   verses + KJV + cross_refs + user tables (+strongs? no)
  nasb-pack.db.gz       content_text rows where translation_code='NASB'
  study-pack.db.gz      interlinear_words + strongs_definitions
  *.sha256              checksums
No Bible text is printed; only sizes and counts.
"""
import argparse
import gzip
import hashlib
import os
import shutil
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seed_red_spans import BOOK_CODE_TO_KJV  # noqa: E402  (reuse not needed, keep import light)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1048576), b''):
            h.update(chunk)
    return h.hexdigest()


def gzip_file(src, dst):
    with open(src, 'rb') as f_in, gzip.open(dst, 'wb', compresslevel=9) as f_out:
        shutil.copyfileobj(f_in, f_out, 1048576)


def copy_schema(src, dst):
    for (sql,) in src.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' "
            "AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"):
        dst.execute(sql)
    for (sql,) in src.execute(
            "SELECT sql FROM sqlite_master WHERE type='index' "
            "AND sql IS NOT NULL"):
        try:
            dst.execute(sql)
        except Exception:
            pass


def copy_rows(src, dst, table, where='', args=()):
    have = {r[0] for r in src.execute(
        "SELECT name FROM sqlite_master WHERE type='table'")}
    if table not in have:
        return 0
    cols = [r[1] for r in src.execute('PRAGMA table_info("%s")' % table)]
    collist = ', '.join('"%s"' % c for c in cols)
    q = 'SELECT %s FROM "%s" %s' % (collist, table, where)
    rows = src.execute(q, args).fetchall()
    dst.executemany(
        'INSERT INTO "%s" (%s) VALUES (%s)' % (
            table, collist, ','.join('?' * len(cols))), rows)
    return len(rows)


def build_all(repo, tmp, out):
    os.makedirs(out, exist_ok=True)
    with gzip.open(os.path.join(repo, 'src-tauri/bundled/refbible.db.gz'), 'rb') as f:
        raw = f.read()
    src_path = os.path.join(tmp, 'v4src.db')
    open(src_path, 'wb').write(raw)
    src = sqlite3.connect(src_path)

    user_tables = ['bookmarks', 'notes', 'highlights',
                   'user_custom_cross_references', 'ai_commentary_cache']

    # Slim: everything except NASB text, interlinear, strongs.
    slim_path = os.path.join(tmp, 'refbible-slim.db')
    if os.path.exists(slim_path):
        os.remove(slim_path)
    slim = sqlite3.connect(slim_path)
    copy_schema(src, slim)
    for t in ['verses', 'cross_references'] + user_tables:
        copy_rows(src, slim, t)
    copy_rows(src, slim, 'content_text', "WHERE translation_code='KJV'")
    slim.commit()
    slim.execute('VACUUM')
    slim.close()

    # NASB pack.
    nasb_path = os.path.join(tmp, 'nasb-pack.db')
    if os.path.exists(nasb_path):
        os.remove(nasb_path)
    nasb = sqlite3.connect(nasb_path)
    copy_schema(src, nasb)
    n_nasb = copy_rows(src, nasb, 'content_text', "WHERE translation_code='NASB'")
    nasb.commit()
    nasb.execute('VACUUM')
    nasb.close()

    # Study pack: interlinear + strongs.
    study_path = os.path.join(tmp, 'study-pack.db')
    if os.path.exists(study_path):
        os.remove(study_path)
    study = sqlite3.connect(study_path)
    copy_schema(src, study)
    n_inter = copy_rows(src, study, 'interlinear_words')
    n_strongs = copy_rows(src, study, 'strongs_definitions')
    study.commit()
    study.execute('VACUUM')
    study.close()
    src.close()

    manifest = {}
    for name, path in [('refbible-slim.db', slim_path),
                       ('nasb-pack.db', nasb_path),
                       ('study-pack.db', study_path)]:
        gz = os.path.join(out, name + '.gz')
        gzip_file(path, gz)
        digest = sha256_file(gz)
        with open(gz + '.sha256', 'w') as f:
            f.write('%s  %s.gz\n' % (digest, name))
        manifest[name] = {
            'raw_mb': round(os.path.getsize(path) / 1048576, 2),
            'gz_mb': round(os.path.getsize(gz) / 1048576, 2),
            'sha256': digest,
        }
    manifest['counts'] = {'nasb_rows': n_nasb, 'interlinear_rows': n_inter,
                          'strongs_rows': n_strongs}
    with open(os.path.join(out, 'v4-manifest.json'), 'w') as f:
        import json
        json.dump(manifest, f, indent=2)
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', required=True)
    ap.add_argument('--tmp', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    build_all(args.repo, args.tmp, args.out)
