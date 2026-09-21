"""Unit tests for the red-letter aligner (span-level Words of Christ).

Run:  python -m pytest scripts/test_align_red_letters.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from align_red_letters import (  # noqa: E402
    normalize,
    align_quote,
    find_span,
    map_token_span,
    GENEVA_EXTRA,
)


def test_normalize_archaic_pronouns():
    assert normalize("Thou shalt not tempt thee") == normalize("You shalt not tempt you")
    # thine/thy are the same word (vowel vs consonant form)
    assert normalize("Stretch forth thine hand") == normalize("Stretch forth thy hand")


def test_geneva_spelling_map_recovers_saying():
    # "Let be nowe" genuinely differs from "Suffer it to be so now", so this
    # stays review (plain in v1) -- but the spelling map must at least align
    # the shared tail ("for thus it becommeth vs to fulfill all righteousnes").
    span, score, flag = align_quote(
        "Suffer it to be so now: for thus it becometh us to fulfil all righteousness.",
        "Then Iesus answering, saide to him, Let be nowe: for thus it becommeth vs "
        "to fulfill all righteousnes. So he suffered him.",
        extra=GENEVA_EXTRA,
    )
    assert flag == "review"
    assert span is not None
    # without the map the same verse scores far lower (proves the map works)
    _, low_score, _ = align_quote(
        "Suffer it to be so now: for thus it becometh us to fulfil all righteousness.",
        "Then Iesus answering, saide to him, Let be nowe: for thus it becommeth vs "
        "to fulfill all righteousnes. So he suffered him.",
    )
    assert score > low_score


def test_identical_text_scores_one():
    span, score, flag = align_quote("come unto me", "Come unto me, all ye.")
    assert score == 1.0
    assert flag == "exact"
    assert span is not None


def test_paraphrase_scores_mid():
    span, score, flag = align_quote(
        "Suffer it to be so now",
        "Allow it now, for this is the way for us.",
    )
    assert span is None or score < 0.85


def test_absent_quote_returns_none():
    span, score, flag = align_quote("come unto me", "In the beginning God created.")
    assert span is None
    assert flag in ("absent", "low")


def test_repeated_phrase_flagged_ambiguous():
    text = "Blessed are the poor. Blessed are the poor in spirit."
    span, score, flag = align_quote("Blessed are the poor", text)
    assert flag == "ambiguous"
    assert span is None


def test_empty_quote_rejected():
    span, score, flag = align_quote("", "Some verse text here.")
    assert span is None


def test_insertion_inside_saying_accepted():
    # "to be so" absent in target -> 0.8 coverage -> review (plain in v1).
    # The guardrail holds: close but not identical stays out of auto-accept.
    span, score, flag = align_quote(
        "Suffer it to be so now: for thus it becometh us to fulfil all righteousness.",
        "But Jesus answering said unto him, Suffer [it] now: for thus it becometh us "
        "to fulfil all righteousness. Then he suffereth him.",
    )
    assert flag == "review"
    assert span is not None


def test_reworded_saying_goes_to_review():
    span, score, flag = align_quote(
        "It is written again, Thou shalt not tempt the Lord thy God.",
        "Jesus said unto him, Again it is written, Thou shalt not make trial of the Lord thy God.",
    )
    assert flag == "review"


def test_find_span_maps_tokens_to_chars():
    text = "For God so loved the world."
    span, score = find_span(["god", "so", "loved"], ["for", "god", "so", "loved", "the", "world"], text)
    assert span is not None
    assert text[span[0]:span[1]] == "God so loved"
    assert score > 0.9


def test_map_token_span_ignores_quote_spacing():
    span_text = '\u201c It is written, \u201c Man shall not live'
    target = 'But he answered, \u201cIt is written, \u201cMan shall not live by bread.'
    span = map_token_span(span_text, target)
    assert span is not None
    # span starts at the first word (quote marks stay plain, as in print)
    assert target[span[0]:span[1]] == 'It is written, \u201cMan shall not live'


def test_map_token_span_ambiguous_returns_none():
    assert map_token_span("blessed are the poor", "Blessed are the poor. Blessed are the poor!") is None


def test_map_token_span_absent_returns_none():
    assert map_token_span("come unto me", "In the beginning God created.") is None
