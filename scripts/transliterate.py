"""
Transliteration generator for Biblical Hebrew and Greek.
Converts Unicode original text to simplified Latin transliteration.
"""

import unicodedata

# === HEBREW ===

# Hebrew consonant transliteration (SBL-style simplified)
CONSONANT = {
    '\u05D0': '',     # alef (silent, use ' for glottal stop)
    '\u05D1': 'b',    # bet
    '\u05D2': 'g',    # gimel
    '\u05D3': 'd',    # dalet
    '\u05D4': 'h',    # he
    '\u05D5': 'w',    # vav
    '\u05D6': 'z',    # zayin
    '\u05D7': 'h',    # het
    '\u05D8': 't',    # tet
    '\u05D9': 'y',    # yod
    '\u05DA': 'k',    # final kaf
    '\u05DB': 'k',    # kaf
    '\u05DC': 'l',    # lamed
    '\u05DD': 'm',    # final mem
    '\u05DE': 'm',    # mem
    '\u05DF': 'n',    # final nun
    '\u05E0': 'n',    # nun
    '\u05E1': 's',    # samekh
    '\u05E2': '',     # ayin (silent, use ' for pharyngeal)
    '\u05E3': 'p',    # final pe
    '\u05E4': 'p',    # pe
    '\u05E5': 'ts',   # final tsade
    '\u05E6': 'ts',   # tsade
    '\u05E7': 'q',    # qof
    '\u05E8': 'r',    # resh
    '\u05E9': 'sh',   # shin (without dot, default sh)
    '\u05EA': 't',    # tav
}

# Vowel transliteration
VOWEL = {
    '\u05B0': 'e',      # sheva (simplified to 'e')
    '\u05B1': 'e',      # hatef segol (simplified)
    '\u05B2': 'a',      # hatef patah
    '\u05B3': 'o',      # hatef qamets
    '\u05B4': 'i',      # hiriq
    '\u05B5': 'e',      # tsere
    '\u05B6': 'e',      # segol
    '\u05B7': 'a',      # patah
    '\u05B8': 'a',      # qamets
    '\u05B9': 'o',      # holam
    '\u05BA': 'o',      # holam haser
    '\u05BB': 'u',      # qibbuts
    '\u05BC': '',       # dagesh
}

# Cantillation marks to skip (Unicode block U+0591–U+05AF + extras)
CANTILLATION = {chr(cp) for cp in list(range(0x0591, 0x05B0)) + [0x05BD, 0x05BF, 0x05C0, 0x05C3]}

def is_hebrew_letter(c):
    return 0x05D0 <= ord(c) <= 0x05EA

def is_shin_dot(c):
    return c in ('\u05C1', '\u05C2')

def transliterate_hebrew(text):
    result = []
    i = 0
    while i < len(text):
        c = text[i]
        if c in CANTILLATION or c in ('\u05C1', '\u05C2'):
            i += 1
            continue
        
        if is_hebrew_letter(c):
            # Get consonant transliteration
            con = ''
            is_mater = False
            if c == '\u05E9':
                con = 's' if any(text[j] == '\u05C2' for j in range(i+1, min(i+3, len(text)))) else 'sh'
            elif c in ('\u05D9', '\u05D5'):
                # Check if yod/vav is a mater lectionis
                if c == '\u05D5':
                    # Look ahead: vav followed by dagesh+shureq or just dagesh -> mater
                    found_dagesh = False
                    for j in range(i+1, min(i+3, len(text))):
                        if text[j] == '\u05BC':
                            found_dagesh = True
                        elif text[j] == '\u05BB':
                            is_mater = True
                            break
                    if found_dagesh and not is_mater:
                        is_mater = True  # dagesh alone on vav = shureq
                # If not determined yet, look behind for preceding vowel
                if not is_mater:
                    for j in range(i-1, max(-1, i-5), -1):
                        if text[j] in VOWEL and text[j] != '\u05BC':
                            vi = VOWEL[text[j]]
                            if c == '\u05D9' and text[j] == '\u05B4':
                                is_mater = True
                            elif c == '\u05D5' and text[j] in ('\u05B9', '\u05BA', '\u05BB'):
                                is_mater = True
                            break
                if not is_mater:
                    con = 'y' if c == '\u05D9' else 'w'
            else:
                con = CONSONANT.get(c, '')
            
            # Collect following vowel(s) for this consonant
            vowel_out = ''
            j = i + 1
            while j < len(text):
                nc = text[j]
                if nc in CANTILLATION:
                    j += 1
                    continue
                if nc in ('\u05BC', '\u05C1', '\u05C2'):
                    j += 1
                    continue  # dagesh/sh-dot: skip
                if nc in VOWEL:
                    v = VOWEL[nc]
                    # Handle mater+vowel merge
                    if con == 'w' and nc in ('\u05B9', '\u05BA'):
                        con = 'o'
                    elif con == 'w' and nc == '\u05BB':
                        con = 'u'
                    elif is_mater:
                        pass  # skip vowel output (mater already carries it)
                    else:
                        vowel_out = v
                    j += 1
                    break
                else:
                    break  # next consonant or other char
            
            # For vav with dagesh (shureq, mater), output 'u' if no vowel collected
            if is_mater and c == '\u05D5' and not vowel_out:
                # Check if we had a dagesh after vav (shureq implied)
                for j in range(i+1, min(i+3, len(text))):
                    if text[j] == '\u05BC':
                        vowel_out = 'u'
                        break
            
            if con:
                result.append(con)
            if vowel_out:
                result.append(vowel_out)
            
            i = j  # Skip to after the vowel we processed
            continue
        
        i += 1
    
    return ''.join(result)

# === GREEK ===

# Greek → Latin transliteration
GREEK_BASE = {
    '\u03B1': 'a', '\u0391': 'A',
    '\u03B2': 'b', '\u0392': 'B',
    '\u03B3': 'g', '\u0393': 'G',
    '\u03B4': 'd', '\u0394': 'D',
    '\u03B5': 'e', '\u0395': 'E',
    '\u03B6': 'z', '\u0396': 'Z',
    '\u03B7': 'e', '\u0397': 'E',
    '\u03B8': 'th', '\u0398': 'Th',
    '\u03B9': 'i', '\u0399': 'I',
    '\u03BA': 'k', '\u039A': 'K',
    '\u03BB': 'l', '\u039B': 'L',
    '\u03BC': 'm', '\u039C': 'M',
    '\u03BD': 'n', '\u039D': 'N',
    '\u03BE': 'x', '\u039E': 'X',
    '\u03BF': 'o', '\u039F': 'O',
    '\u03C0': 'p', '\u03A0': 'P',
    '\u03C1': 'r', '\u03A1': 'R',
    '\u03C2': 's', '\u03C3': 's', '\u03A3': 'S',
    '\u03C4': 't', '\u03A4': 'T',
    '\u03C5': 'u', '\u03A5': 'U',
    '\u03C6': 'ph', '\u03A6': 'Ph',
    '\u03C7': 'ch', '\u03A7': 'Ch',
    '\u03C8': 'ps', '\u03A8': 'Ps',
    '\u03C9': 'o', '\u03A9': 'O',
}

def transliterate_greek(text):
    result = []
    for c in text:
        cp = ord(c)
        is_greek = 0x0370 <= cp <= 0x03FF or 0x1F00 <= cp <= 0x1FFF
        if is_greek:
            if c in GREEK_BASE:
                t = GREEK_BASE[c]
            else:
                decomposed = unicodedata.normalize('NFKD', c)
                base = decomposed[0] if decomposed else c
                has_ypogegrammeni = any(ord(s) in (0x0345,) for s in decomposed[1:])
                has_dasia = any(ord(s) == 0x0314 for s in decomposed[1:])
                t = GREEK_BASE.get(base, c.lower())
                if has_ypogegrammeni:
                    t += 'i'
                if has_dasia:
                    t = ('H' if t[0].isupper() else 'h') + t
            result.append(t)
        else:
            result.append(c)
    
    word = ''.join(result)
    # Find standalone 'h' (not part of 'ch', 'ph', 'th', 'ps', 'rh')
    h_pos = -1
    for i, ch in enumerate(word):
        if ch == 'h':
            if i == 0 or word[i-1] not in ('c', 'C', 'p', 'P', 't', 'T', 's', 'S', 'r', 'R'):
                h_pos = i
                break
    if h_pos > 0:
        cap = word[0].isupper()
        rest = (word[:h_pos] + word[h_pos+1:]).lower()
        word = ('H' if cap else 'h') + rest
    return word

# === API ===

def transliterate(language, text):
    if language == 'hebrew':
        return transliterate_hebrew(text)
    elif language == 'greek':
        return transliterate_greek(text)
    return text


if __name__ == '__main__':
    import sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    # Debug Greek
    c = '\u1F26'
    print(f'U+1F26 = {c}')
    print(f'  In base map: {c in GREEK_BASE}')
    dec = unicodedata.normalize('NFKD', c)
    print(f'  NFKD: {" ".join(f"U+{ord(x):04X}" for x in dec)}')
    base = dec[0] if dec else c
    print(f'  Base: U+{ord(base):04X} = {base}')
    print(f'  Base in map: {base in GREEK_BASE}')
    print(f'  Comb marks: [{" ".join(f"U+{ord(x):04X}" for x in dec[1:])}]')

    # Test Hebrew
    heb_words = [
        '\u05D1\u05BC\u05B0\u05E8\u05B5\u05D0\u05E9\u05C1\u05B4\u0596\u05D9\u05EA',  # bereshit
        '\u05D1\u05BC\u05B8\u05E8\u05B8\u05A3\u05D0',  # bara
        '\u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u0591\u05D9\u05DD',  # elohim
        '\u05D0\u05B5\u05A5\u05EA',  # et
        '\u05D4\u05B7\u05E9\u05C1\u05BC\u05B8\u05DE\u05B7\u0596\u05D9\u05B4\u05DD',  # hashamayim
        '\u05D5\u05B0\u05D0\u05B5\u05A5\u05EA',  # weet
        '\u05D4\u05B8\u05D0\u05B8\u05BD\u05E8\u05B6\u05E5\u05C3',  # haarets
        '\u05E9\u05B0\u05DE\u05BB\u05E2\u05B8\u05EA\u05B5\u05E0\u05D5\u05BC',  # shemuatenu (our report)
    ]
    for w in heb_words:
        t = transliterate_hebrew(w)
        print(f'{w} -> {t}')

    print()

    # Test Greek
    grk_words = [
        '\u1F18\u03BD',                         # En (smooth breathing)
        '\u1F00\u03C1\u03C7\u1FC7',             # archei (smooth)
        '\u1F26\u03BD',                         # en (smooth eta)
        '\u1F41',                               # ho (rough omicron)
        '\u03BB\u03CC\u03B3\u03BF\u03C2',       # logos (no breathing)
        '\u03BF\u1F55\u03C4\u03C9\u03C2',       # houtos (ou- with rough on upsilon -> Houtos)
        '\u03C5\u1F31\u1F79\u03BD',             # huion (hy- with rough on iota -> Huion)
        '\u1F14\u03C7\u03B5\u03B9',             # echei (smooth epsilon + ch)
    ]
    for w in grk_words:
        t = transliterate_greek(w)
        print(f'{w} -> {t}')
