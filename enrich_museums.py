#!/usr/bin/env python3
from __future__ import annotations

"""
Museum enrichment — populate museum_translations for all museums across 10 locales.

Fills: description, seo_description (visiting_tips left NULL)
Skips museums that already have locale='en' in museum_translations (resumable).
"""

import os
import sys
import time
from pathlib import Path

from openai import OpenAI
from supabase import create_client

# Load project .env then .env.local (same convention as Next.js; not auto-loaded for plain python)
_root = Path(__file__).resolve().parent
try:
    from dotenv import load_dotenv

    load_dotenv(_root / ".env")
    load_dotenv(_root / ".env.local", override=True)
except ImportError:
    pass

# ── CONFIG (same vars as enrich_final.py) ─────────────────────────────────────
SUPABASE_URL = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/") or (
    "https://froigstrpvutwqtqikzt.supabase.co"
)
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY", ""
)
OPENAI_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get(
    "NEXT_PUBLIC_OPENAI_API_KEY", ""
)

if not (SUPABASE_KEY or "").strip():
    print(
        "Missing SUPABASE_SERVICE_KEY in .env or .env.local.",
        file=sys.stderr,
    )
    sys.exit(1)
if not (OPENAI_KEY or "").strip():
    print("Missing OPENAI_API_KEY in .env or .env.local.", file=sys.stderr)
    sys.exit(1)

SLEEP_SEC = 0.5
OPENAI_MODEL = "gpt-4o"
MAX_SEO_LEN = 155

# Set to a slug to process one museum only (skips resume check). Set None for full run.
TEST_SLUG_ONLY: str | None = None

FORCE_SLUGS = {"mauritshuis"}

LOCALES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh": "Chinese (Simplified)",
    "ja": "Japanese",
    "ko": "Korean",
}

TRANSLATION_LOCALES = [code for code in LOCALES if code != "en"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_KEY)


def _city_country(city: str | None, country: str | None) -> tuple[str, str]:
    city_s = (city or "").strip() or "unknown city"
    country_s = (country or "").strip() or "unknown country"
    return city_s, country_s


def _strip_markdown_fences(text: str) -> str:
    raw = (text or "").strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        if len(parts) >= 2:
            raw = parts[1]
            if raw.startswith("text"):
                raw = raw[4:]
            elif raw.startswith("markdown"):
                raw = raw[8:]
        raw = raw.strip()
    return raw


def _openai_text(prompt: str) -> str:
    response = openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=1200,
    )
    return _strip_markdown_fences(response.choices[0].message.content or "")


def build_description_prompt(
    museum_name: str,
    city: str,
    country: str,
    artwork_count: int,
) -> str:
    return f"""You are writing copy for an art platform that shows public domain paintings. 
Write a 200-250 word page description for {museum_name} in {city}, {country}. 
The platform has {artwork_count} works from this museum available free online.

Structure (follow exactly):
Paragraph 1 (3 sentences): Open with the single most iconic painting or artist 
at this museum — name it specifically and say one concrete thing about it 
(date, style, why it matters). Second sentence introduces the museum and 
collection size ({artwork_count} works). Third sentence names 2-3 other 
specific artists or works in the collection.

Paragraph 2 (2-3 sentences): What makes this museum different from every other 
museum — its specific focus, building, history, or collection angle. Be concrete. 
No museum is just "comprehensive" or "diverse" — what is the actual specific thing?

Paragraph 3 (2 sentences): Who should explore this collection and why. 
End with a direct CTA to browse the {artwork_count} works online.

Hard rules:
- Every claim must be specific — no vague adjectives
- BANNED words: boasts, tapestry, journey, nestled, stunning, breathtaking, 
  invaluable, unparalleled, testament, delve, richness, heritage, showcase, 
  comprehensive, diverse, vibrant, treasure, gem
- Keywords to include naturally: "{museum_name}", "{city} art museum", 
  "paintings", "collection", "masterpieces"  
- No markdown, no quotes around artwork titles, plain text only"""


def build_seo_prompt(
    museum_name: str,
    city: str,
    country: str,
    artwork_count: int,
) -> str:
    return f"""Write a meta description for {museum_name} in {city}, {country} 
for an art collection platform that has {artwork_count} public domain artworks 
from this museum available free to explore and download.

Rules:
- Maximum 155 characters — count every character, never exceed this
- Must mention {museum_name} by name
- Must include the number {artwork_count}
- Must end with exactly one of: "Explore free." or "Browse free." or 
  "Free to download."
- Mention the most famous artist OR artwork associated with this museum
- No quotation marks, no em dashes, no ellipsis
- Return plain text only, one sentence or two short sentences maximum"""


def build_translate_description_prompt(language_name: str, english_description: str) -> str:
    return f"""Translate the following art museum description into {language_name}. 

Rules:
- Keep all proper nouns in their original form: museum names, artist names, artwork titles stay unchanged
- Adapt naturally for native {language_name} speakers, do not translate word for word
- Keep the same length as the original (200-250 words)
- Return plain text only, no markdown

Original English text:
{english_description}"""


def build_translate_seo_prompt(language_name: str, english_seo_description: str) -> str:
    return f"""Translate the following meta description into {language_name}.

Rules:
- Keep all proper nouns unchanged: museum names, artist names, artwork titles
- Maximum 155 characters in the target language — hard limit
- Return plain text only, no markdown

Original English text:
{english_seo_description}"""


def clamp_seo(text: str) -> str:
    text = (text or "").strip()
    if len(text) <= MAX_SEO_LEN:
        return text
    return text[: MAX_SEO_LEN - 3].rstrip() + "..."


def fetch_museums() -> list[dict]:
    result = (
        supabase.table("museums")
        .select("slug, name, city, country")
        .order("name")
        .execute()
    )
    return result.data or []


def fetch_enriched_slugs() -> set[str]:
    result = (
        supabase.table("museum_translations")
        .select("museum_slug")
        .eq("locale", "en")
        .execute()
    )
    return {row["museum_slug"] for row in (result.data or []) if row.get("museum_slug")}


def fetch_artwork_count(museum_name: str) -> int:
    result = (
        supabase.table("artworks")
        .select("id", count="exact", head=True)
        .eq("museum", museum_name)
        .execute()
    )
    return int(result.count or 0)


def upsert_translation(
    museum_slug: str,
    locale: str,
    description: str | None,
    seo_description: str | None,
) -> None:
    for attempt in range(3):
        try:
            supabase.table("museum_translations").upsert(
                {
                    "museum_slug": museum_slug,
                    "locale": locale,
                    "description": description or None,
                    "seo_description": seo_description or None,
                    "visiting_tips": None,
                },
                on_conflict="museum_slug,locale",
            ).execute()
            return
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
            else:
                raise e


def process_museum(museum: dict) -> tuple[str, list[str]]:
    """
    Returns (status, errors) where status is 'processed' | 'skipped' | 'error'.
    """
    slug = (museum.get("slug") or "").strip()
    name = (museum.get("name") or "").strip()
    city, country = _city_country(museum.get("city"), museum.get("country"))

    if not slug or not name:
        return "error", [f"missing slug or name: {museum!r}"]

    errors: list[str] = []

    try:
        artwork_count = fetch_artwork_count(name)
    except Exception as e:
        return "error", [f"artwork count failed: {e}"]

    print(f"  artwork_count={artwork_count}")

    # ── English description ───────────────────────────────────────────────────
    try:
        en_description = _openai_text(
            build_description_prompt(name, city, country, artwork_count)
        )
        time.sleep(SLEEP_SEC)
    except Exception as e:
        return "error", [f"EN description OpenAI failed: {e}"]

    # ── English seo_description ───────────────────────────────────────────────
    try:
        en_seo = clamp_seo(
            _openai_text(build_seo_prompt(name, city, country, artwork_count))
        )
        time.sleep(SLEEP_SEC)
    except Exception as e:
        return "error", [f"EN seo_description OpenAI failed: {e}"]

    print("\n  --- EN description ---")
    print(en_description)
    print("\n  --- EN seo_description ---")
    print(en_seo)
    print(f"  (seo length: {len(en_seo)} chars)\n")

    try:
        upsert_translation(slug, "en", en_description, en_seo)
        print("  ✓ upserted en")
    except Exception as e:
        return "error", [f"EN upsert failed: {e}"]

    # ── Other locales (skipped in TEST_SLUG_ONLY mode) ────────────────────────
    if TEST_SLUG_ONLY:
        return "processed", []

    for locale_code in TRANSLATION_LOCALES:
        language_name = LOCALES[locale_code]
        loc_description: str | None = None
        loc_seo: str | None = None

        try:
            loc_description = _openai_text(
                build_translate_description_prompt(language_name, en_description)
            )
            time.sleep(SLEEP_SEC)
        except Exception as e:
            msg = f"{locale_code} description translation failed: {e}"
            print(f"  ✗ {msg}")
            errors.append(msg)
            continue

        try:
            loc_seo = clamp_seo(
                _openai_text(
                    build_translate_seo_prompt(language_name, en_seo)
                )
            )
            time.sleep(SLEEP_SEC)
        except Exception as e:
            msg = f"{locale_code} seo_description translation failed: {e}"
            print(f"  ✗ {msg}")
            errors.append(msg)
            # Still upsert description if we have it
            try:
                upsert_translation(slug, locale_code, loc_description, None)
                print(f"  ⚠ upserted {locale_code} (description only)")
            except Exception as upsert_err:
                errors.append(f"{locale_code} upsert failed: {upsert_err}")
            continue

        try:
            upsert_translation(slug, locale_code, loc_description, loc_seo)
            print(f"  ✓ upserted {locale_code}")
        except Exception as e:
            msg = f"{locale_code} upsert failed: {e}"
            print(f"  ✗ {msg}")
            errors.append(msg)

    if errors:
        return "error", errors
    return "processed", []


def main() -> None:
    print("=" * 65)
    print("Museum translations enrichment")
    print(f"Locales : {', '.join(LOCALES.keys())} ({len(LOCALES)} total)")
    print(f"Model   : {OPENAI_MODEL}")
    print(f"Sleep   : {SLEEP_SEC}s between OpenAI calls")
    print("=" * 65 + "\n")

    museums = fetch_museums()
    if not museums:
        print("No museums found in museums table.")
        sys.exit(1)

    if TEST_SLUG_ONLY:
        museums = [m for m in museums if (m.get("slug") or "").strip() == TEST_SLUG_ONLY]
        if not museums:
            print(f"No museum found with slug '{TEST_SLUG_ONLY}'.")
            sys.exit(1)
        print(f"TEST MODE: processing only slug={TEST_SLUG_ONLY}\n")

    enriched_slugs = fetch_enriched_slugs()
    if TEST_SLUG_ONLY:
        enriched_slugs = set()
    print(f"Museums in DB     : {len(museums)}")
    print(f"Already have EN   : {len(enriched_slugs)}")
    print(f"To process        : {len(museums) - len(enriched_slugs)}\n")

    total_processed = 0
    total_skipped = 0
    total_errors = 0
    error_details: list[str] = []

    for index, museum in enumerate(museums, start=1):
        slug = (museum.get("slug") or "").strip()
        name = (museum.get("name") or "").strip()

        print(f"[{index}/{len(museums)}] {name} ({slug})")

        if slug in enriched_slugs and slug not in FORCE_SLUGS:
            print("  → skipped (en row exists)")
            total_skipped += 1
            continue

        status, errors = process_museum(museum)

        if status == "processed":
            total_processed += 1
            print("  → done")
        else:
            total_errors += 1
            for err in errors:
                detail = f"{slug}: {err}"
                error_details.append(detail)
                print(f"  → error: {err}")

        time.sleep(SLEEP_SEC)

    print(f"\n{'=' * 65}")
    print("Summary")
    print(f"  Total museums : {len(museums)}")
    print(f"  Processed     : {total_processed}")
    print(f"  Skipped       : {total_skipped}")
    print(f"  Errors        : {total_errors}")

    if error_details:
        print("\nError details:")
        for detail in error_details:
            print(f"  - {detail}")


if __name__ == "__main__":
    main()
