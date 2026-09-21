"""Word-level aligner for red-letter (Words of Christ) spans.

Maps a KJV quote onto another translation's verse text and returns
character offsets plus a confidence score. Precision-first: anything
uncertain comes back as None so the verse renders plain.

Run tests:  python -m pytest scripts/test_align_red_letters.py
"""
import difflib
import re

AUTO_ACCEPT = 0.85
REVIEW_FLOOR = 0.70

# Archaic -> modern equivalents applied to BOTH sides before matching,
# so "thou" in KJV still matches "you" in WEB/ASV/DRA/Geneva.
ARCHAIC = {
    "thou": "you",
    "thee": "you",
    "thy": "your",
    "thine": "yours",
    "ye": "you",
    "hath": "has",
    "doth": "does",
    "hast": "have",
    "dost": "do",
    "saith": "says",
    "spake": "spoke",
    "unto": "to",
    "whence": "where",
    "whither": "where",
    "thence": "there",
    "thither": "there",
    "hither": "here",
    "hence": "here",
    "verily": "truly",
}

_WORD_RE = re.compile(r"[A-Za-z0-9']+")


def tokenize(text):
    """Split into word tokens, keeping char offsets into the original text."""
    return [(m.group(0), m.start(), m.end()) for m in _WORD_RE.finditer(text)]


def norm_token(word):
    return ARCHAIC.get(word.lower(), word.lower())


def normalize(text):
    """Lowercase, archaic-map, strip punctuation, collapse whitespace."""
    return " ".join(norm_token(w) for w, _, _ in tokenize(text))


def _char_span(text, tok_start_idx, tok_end_idx_excl):
    toks = tokenize(text)
    return (toks[tok_start_idx][1], toks[tok_end_idx_excl - 1][2])


def find_span(qtokens, ttokens, text):
    """Map a quote token-run onto the original text.

    Finds the longest contiguous run of qtokens inside ttokens, then
    locates that run inside the tokenization of text. Returns
    ((start, end), score). Score 1.0 when the whole quote maps.
    """
    if not qtokens or not ttokens:
        return None, 0.0
    sm = difflib.SequenceMatcher(None, qtokens, ttokens, autojunk=False)
    block = max(sm.get_matching_blocks(), key=lambda b: b.size, default=None)
    if block is None or block.size == 0:
        return None, 0.0
    run = ttokens[block.b:block.b + block.size]
    wtoks = [w for w, _, _ in tokenize(text)]
    wnorm = [norm_token(w) for w in wtoks]
    # locate the run contiguously inside the text tokens
    idx = -1
    for i in range(len(wnorm) - len(run) + 1):
        if wnorm[i:i + len(run)] == run:
            idx = i
            break
    if idx == -1:
        return None, 0.0
    toks = tokenize(text)
    score = block.size / len(qtokens)
    return (toks[idx][1], toks[idx + len(run) - 1][2]), score


def map_token_span(span_text, target_text):
    """Map an exact-worded span onto a target text at token level.

    Ignores whitespace/punctuation differences (e.g. quote spacing
    between two editions of the same translation). Returns [start, end]
    in target_text coordinates, or None when the token run is absent
    or occurs more than once (ambiguous -- never guess).
    """
    qtokens = [norm_token(w) for w, _, _ in tokenize(span_text)]
    if not qtokens:
        return None
    wtoks = tokenize(target_text)
    wnorm = [norm_token(w) for w, _, _ in wtoks]
    hits = []
    for i in range(len(wnorm) - len(qtokens) + 1):
        if wnorm[i:i + len(qtokens)] == qtokens:
            hits.append(i)
    if len(hits) != 1:
        return None
    i = hits[0]
    return [wtoks[i][1], wtoks[i + len(qtokens) - 1][2]]


def align_quote(quote, text):
    """Align a KJV quote onto a verse text.

    Returns (span | None, score, flag) where flag is one of:
    exact | high | review | ambiguous | absent | low
    """
    if not quote or not quote.strip():
        return None, 0.0, "absent"
    nq = normalize(quote)
    nt = normalize(text)
    if not nq:
        return None, 0.0, "absent"
    # Ambiguous: the quote occurs more than once in the verse.
    if nt.count(nq) > 1:
        return None, 0.0, "ambiguous"
    # Exact normalized substring.
    pos = nt.find(nq)
    if pos != -1:
        # Map back to original-text offsets via token runs.
        qtokens = nq.split()
        wtoks = tokenize(text)
        wnorm = [norm_token(w) for w, _, _ in wtoks]
        idx = -1
        for i in range(len(wnorm) - len(qtokens) + 1):
            if wnorm[i:i + len(qtokens)] == qtokens:
                idx = i
                break
        if idx != -1:
            return (wtoks[idx][1], wtoks[idx + len(qtokens) - 1][2]), 1.0, "exact"
    # Fuzzy: token-level sequence match, scored by QUOTE COVERAGE
    # (matched quote tokens / all quote tokens). Extra narrative words in
    # the target ("Jesus answering said unto him") don't penalize, but
    # words swallowed INSIDE the span are capped (interruptions).
    qtokens = nq.split()
    ttokens = nt.split()
    sm = difflib.SequenceMatcher(None, qtokens, ttokens, autojunk=False)
    blocks = [b for b in sm.get_matching_blocks() if b.size > 0]
    if not blocks:
        return None, 0.0, "absent"
    matched_q = sum(b.size for b in blocks)
    coverage = matched_q / len(qtokens)
    if coverage < REVIEW_FLOOR:
        return None, round(coverage, 3), "low"
    # Span runs from first to last matched target token.
    t_first = min(b.b for b in blocks)
    t_last = max(b.b + b.size for b in blocks)
    interior_extras = (t_last - t_first) - sum(b.size for b in blocks)
    if interior_extras > 6:
        return None, round(coverage, 3), "review"
    run = ttokens[t_first:t_last]
    wtoks = tokenize(text)
    wnorm = [norm_token(w) for w, _, _ in wtoks]
    idx = -1
    for i in range(len(wnorm) - len(run) + 1):
        if wnorm[i:i + len(run)] == run:
            idx = i
            break
    if idx == -1:
        return None, round(coverage, 3), "low"
    span = (wtoks[idx][1], wtoks[idx + len(run) - 1][2])
    score = round(coverage, 3)
    if score >= AUTO_ACCEPT:
        return span, score, "high"
    return span, score, "review"
