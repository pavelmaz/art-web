#!/usr/bin/env python3
"""
Artwork enrichment — single pass
Runs mapping corrections in memory, then OpenAI reviews and fills
everything in one shot. One API call per artwork, one DB write per artwork.

Fills: style_title, subject, tags, alt_text, artwork_translations (10 locales)
"""

import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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

# ── CONFIG (same vars as Next.js: .env / .env.local) ───────────────────────────
SUPABASE_URL = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/") or (
    "https://froigstrpvutwqtqikzt.supabase.co"
)
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")

if not (SUPABASE_KEY or "").strip():
    print(
        "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env or .env.local.",
        file=sys.stderr,
    )
    sys.exit(1)
if not (OPENAI_KEY or "").strip():
    print("Missing OPENAI_API_KEY in .env or .env.local.", file=sys.stderr)
    sys.exit(1)

BATCH_SIZE   = 50
SLEEP_SEC    = 0.5
PRODUCTION   = True  # False = 10 artworks test, True = full run

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

supabase      = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_KEY)

FAILED_ARTWORK_IDS = set()
_FAILED_IDS_LOCK = threading.Lock()


def _record_failed_artwork_id(artwork_id) -> None:
    with _FAILED_IDS_LOCK:
        FAILED_ARTWORK_IDS.add(artwork_id)

# ── CONTROLLED VOCABULARIES ───────────────────────────────────────────────────
VALID_STYLES = [
    "Baroque", "Renaissance", "Northern Renaissance", "Romanticism",
    "Impressionism", "Post-Impressionism", "Realism", "Dutch Golden Age",
    "Rococo", "Neoclassicism", "Expressionism", "Symbolism", "Art Nouveau",
    "Modernism", "Surrealism", "Ukiyo-e", "Chinese Traditional",
    "Japanese Traditional", "Korean Traditional", "Indian Traditional",
    "Islamic Art", "Buddhist Art", "Academic", "Pre-Raphaelite",
    "Mannerism", "Gothic", "Cubism", "Folk Art", "Colonial American",
    "Mughal", "Victorian", "Contemporary",
]

VALID_SUBJECTS = [
    "Landscape", "Portrait", "Still Life", "Religious", "Mythology",
    "Marine", "Historical", "Figurative", "Abstract", "Interior",
    "Botanical", "Illustration", "Drawing", "Architecture",
    "Genre Scene", "Allegory", "Animal", "Decorative Art",
]

BAD_TAGS = {
    "print", "painting", "artwork", "image", "canvas", "drawing",
    "illustration", "picture", "art", "oil", "watercolor", "watercolour",
    "sketch", "etching", "lithograph", "engraving", "photograph",
}

# ── MAPPING TABLES (run in memory, not written to DB separately) ──────────────
STYLE_CORRECTIONS = {
    # Subjects wrongly placed in style_title → clear, let OpenAI fill
    "Landscape":                        None,
    "Mythology":                        None,
    "Portrait":                         None,
    "Abstract":                         None,
    "Null":                             None,
    "null":                             None,
    # Consolidate variants
    "Edo Period (Japan)":               "Ukiyo-e",
    "Yamato-e":                         "Japanese Traditional",
    "Traditional Chinese Painting":     "Chinese Traditional",
    "Japanese Painting":                "Japanese Traditional",
    "Japanese Art":                     "Japanese Traditional",
    "East Asian Traditional":           "Chinese Traditional",
    "Indian Traditional Painting":      "Indian Traditional",
    "Tibetan Buddhist Art":             "Buddhist Art",
    "Ming Dynasty":                     "Chinese Traditional",
    "Korean Traditional Painting":      "Korean Traditional",
    "18th-century British portraiture": "Rococo",
    "American Impressionism":           "Impressionism",
    "Hudson River School":              "Romanticism",
    "Persian Miniature Painting":       "Islamic Art",
    "Chinese Decorative Arts":          "Chinese Traditional",
    "Song Dynasty":                     "Chinese Traditional",
}

GENRE_TO_SUBJECT = {
    "landscape":             "Landscape",
    "portrait":              "Portrait",
    "religious":             "Religious",
    "Religious":             "Religious",
    "historical":            "Historical",
    "genre scene":           "Genre Scene",
    "genre painting":        "Genre Scene",
    "still life":            "Still Life",
    "mythological":          "Mythology",
    "marine":                "Marine",
    "maritime":              "Marine",
    "marine painting":       "Marine",
    "seascape":              "Marine",
    "interior":              "Interior",
    "interior scene":        "Interior",
    "abstract":              "Abstract",
    "allegorical":           "Allegory",
    "architecture":          "Architecture",
    "architectural":         "Architecture",
    "architectural design":  "Architecture",
    "architectural drawing": "Architecture",
    "monument":              "Architecture",
    "animal":                "Animal",
    "animal painting":       "Animal",
    "sketch":                "Drawing",
    "heraldic":              "Historical",
    "military":              "Historical",
    "literary":              "Allegory",
    "figurative":            "Figurative",
    "decorative art":        "Decorative Art",
    "decorative arts":       "Decorative Art",
    "textile art":           "Decorative Art",
    # Garbage → null (let OpenAI infer from description)
    "Painting":              None,
    "painting":              None,
    "Works on Paper":        None,
    "sculpture":             None,
    "null":                  None,
}


def pre_clean(artwork: dict) -> dict:
    """
    Run mapping corrections in memory.
    Returns a dict with pre-cleaned hint values to pass into the prompt.
    Nothing is written to the DB here.
    """
    style   = artwork.get("style_title")
    genre   = artwork.get("genre_title")
    subject = artwork.get("subject")

    # Style: apply correction map
    if style in STYLE_CORRECTIONS:
        style = STYLE_CORRECTIONS[style]  # may be None

    # Subject: seed from genre if subject is empty
    if not subject and genre:
        if genre in GENRE_TO_SUBJECT:
            subject = GENRE_TO_SUBJECT[genre]
        elif "," in genre:
            subject = None  # compound garbage, ignore

    return {
        "style_hint":   style,    # pre-cleaned, may still be None
        "subject_hint": subject,  # seeded from genre if possible
    }


def fmt(val, label=""):
    """Format a value clearly for the prompt."""
    if val is None:
        return f"null — MUST be filled{(' (' + label + ')') if label else ''}"
    if isinstance(val, list):
        if not val:
            return "null — MUST be filled"
        joined = ", ".join(str(v) for v in val)
        return f"{joined}  ← review, likely wrong or low quality"
    return f"{val}  ← review: keep if correct, fix if wrong"


def build_prompt(artwork: dict, hints: dict) -> str:
    desc = (artwork.get("description") or "")[:400]
    med  = artwork.get("medium_display") or "unknown"
    date = artwork.get("date_display") or "unknown"

    # Build locale output block
    locale_lines = ""
    for code, name in LOCALES.items():
        locale_lines += f"""
  "{code}": {{
    "seo_description": "{name}, max 155 chars",
    "alt_text": "{name}, max 125 chars"
  }},"""
    locale_lines = locale_lines.rstrip(",")

    return f"""You are an expert art cataloguer and SEO specialist for a 
public domain art gallery. Users download high-resolution artworks free.

Review every field below. Values may be null, wrong, or low quality.
Produce the best possible output for all fields.

Artwork:
  Title       : {artwork.get("title", "")}
  Artist      : {artwork.get("artist_display", "")}
  Date        : {date}
  Medium      : {med}
  Description : {desc}

Current values to review:
  style_title : {fmt(hints["style_hint"])}
  subject     : {fmt(hints["subject_hint"])}
  tags        : {fmt(artwork.get("tags"))}
  alt_text    : {fmt(artwork.get("alt_text"))}

─── FIELD RULES ─────────────────────────────────────────────────────────

STYLE_TITLE — pick ONE from this list only (required, never null):
{", ".join(VALID_STYLES)}
Use your knowledge of art history to determine the correct movement
even if the hint is null. If genuinely impossible to determine, use
the closest plausible match.

SUBJECT — pick ONE from this list only (required, never null):
{", ".join(VALID_SUBJECTS)}

TAGS — exactly 3 to 5 tags. Rules:
• Each tag: 1-2 words max, lowercase
• Describe what is VISUALLY depicted: motifs, objects, mood, setting
• FORBIDDEN words (never use these): print, painting, artwork, image,
  canvas, drawing, illustration, picture, art, oil, watercolor,
  watercolour, sketch, etching, lithograph, engraving, photograph
• Good examples: horse, storm, nude, candlelight, mountain, ship,
  garden, harvest, child, snow, ruins, forest, battle, flowers,
  river, village, self-portrait, crowd, night scene, golden light

SEO_DESCRIPTION (every locale):
• Max 155 characters — hard limit, never exceed
• Mention artwork title and artist name
• Say it is free to download
• Compelling for Google — someone must want to click it
• No exclamation marks
• Never use: masterpiece, stunning, beautiful, amazing, discover
• Do NOT start the sentence with the artwork title

ALT_TEXT (every locale):
• Max 125 characters — hard limit, never exceed
• Describe what is visually depicted in the image
• Include the medium (e.g. oil painting, etching, watercolour)
• Include the artist name
• Never start with: image of, photo of, picture of
• Never use: beautiful, stunning, masterpiece

─── OUTPUT FORMAT ───────────────────────────────────────────────────────

Return ONLY raw JSON. No markdown. No code blocks. No explanation.

{{
  "style_title": "one value from the styles list",
  "subject": "one value from the subjects list",
  "tags": ["tag1", "tag2", "tag3"],
  {locale_lines}
}}"""


def process_artwork(artwork: dict) -> bool:
    artwork_id = artwork["id"]

    # Pre-clean in memory — no DB write
    hints = pre_clean(artwork)

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": build_prompt(artwork, hints)}],
            temperature=0.3,
            max_tokens=2000,
        )
        raw = response.choices[0].message.content.strip()

        # Strip accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)

    except json.JSONDecodeError as e:
        print(f"  ✗ JSON parse error [{artwork_id}]: {e}")
        return False
    except Exception as e:
        print(f"  ✗ OpenAI error [{artwork_id}]: {e}")
        return False

    try:
        # ── Validate style_title ──────────────────────────────────────────
        style = data.get("style_title")
        if style not in VALID_STYLES:
            print(f"  ⚠ Invalid style '{style}' → null")
            style = None

        # ── Validate subject ──────────────────────────────────────────────
        subject = data.get("subject")
        if subject not in VALID_SUBJECTS:
            print(f"  ⚠ Invalid subject '{subject}' → null")
            subject = None

        # ── Validate and clean tags ───────────────────────────────────────
        tags = data.get("tags", [])
        if isinstance(tags, list):
            tags = [
                t.lower().strip() for t in tags
                if isinstance(t, str)
                and t.lower().strip() not in BAD_TAGS
                and len(t.strip()) > 1
            ][:5]  # max 5 tags

        en_data = data.get("en", {})

        # ── Single DB write to artworks ───────────────────────────────────
        update_ok = False
        last_update_err = None
        for attempt in range(3):
            try:
                supabase.table("artworks").update({
                    "style_title": style,
                    "subject":     subject,
                    "tags":        tags if tags else None,
                    "alt_text":    en_data.get("alt_text"),
                }).eq("id", artwork_id).execute()
                update_ok = True
                break
            except Exception as e:
                last_update_err = e
                if attempt < 2:
                    time.sleep(2)
        if not update_ok:
            print(
                f"  ✗ artworks update failed after 3 attempts [{artwork_id}]: "
                f"{last_update_err}"
            )
            _record_failed_artwork_id(artwork_id)
            return False

        # ── Upsert all 10 locales into artwork_translations ───────────────
        for locale_code in LOCALES.keys():
            locale_data = data.get(locale_code, {})
            if not locale_data:
                continue

            seo = locale_data.get("seo_description") or ""
            alt = locale_data.get("alt_text") or ""

            # Safety net: enforce char limits
            if len(seo) > 155:
                seo = seo[:152] + "..."
            if len(alt) > 125:
                alt = alt[:122] + "..."

            upsert_ok = False
            last_upsert_err = None
            for attempt in range(3):
                try:
                    supabase.table("artwork_translations").upsert({
                        "artwork_id":      artwork_id,
                        "locale":          locale_code,
                        "seo_description": seo or None,
                        "alt_text":        alt or None,
                        "updated_at":      "now()",
                    }, on_conflict="artwork_id,locale").execute()
                    upsert_ok = True
                    break
                except Exception as e:
                    last_upsert_err = e
                    if attempt < 2:
                        time.sleep(2)
            if not upsert_ok:
                print(
                    f"  ✗ artwork_translations upsert failed after 3 attempts "
                    f"artwork_id={artwork_id} locale={locale_code}: {last_upsert_err}"
                )
                _record_failed_artwork_id(artwork_id)

        print(
            f"  ✓ {artwork_id[:32]:<32} "
            f"style={str(style or '?'):<24} "
            f"subject={str(subject or '?'):<16} "
            f"tags={tags}"
        )
        return True

    except Exception as e:
        print(f"  ✗ DB write error [{artwork_id}]: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 65)
    print("Art Gallery — Single Pass Enrichment")
    print(f"Mode    : {'PRODUCTION (all rows)' if PRODUCTION else 'TEST (10 rows)'}")
    print(f"Locales : {', '.join(LOCALES.keys())} ({len(LOCALES)} total)")
    print(f"Fills   : style_title, subject, tags, alt_text, translations")
    print("=" * 65 + "\n")
    print(f"Workers: 10 parallel | Batch size: {BATCH_SIZE}")

    total   = 0
    success = 0
    limit   = 10 if not PRODUCTION else 9_999_999

    last_id = None
    last_score = None
    batch_num = 0

    while True:
        batch_num += 1
        q = supabase.table("artworks") \
            .select("id, score, title, artist_display, description, "
                    "style_title, genre_title, subject, tags, "
                    "alt_text, medium_display, date_display") \
            .not_.filter(
                "id",
                "in",
                "(select artwork_id from artwork_translations where locale = 'en')",
            )

        if last_id is None:
            q = q.order("score", desc=True).order("id", desc=True).limit(BATCH_SIZE)
        else:
            ls_str = str(last_score)
            sid = str(last_id)
            or_filters = (
                f"score.lt.{ls_str},and(score.eq.{ls_str},id.lt.{sid})"
            )
            q = q.or_(or_filters).order("score", desc=True).order(
                "id", desc=True
            ).limit(BATCH_SIZE)

        result = q.execute()

        batch = result.data
        if not batch:
            print("\nAll rows processed.")
            break

        print(f"Batch {batch_num} — {len(batch)} rows")

        room = limit - total
        if room <= 0:
            break
        chunk = batch[:room]

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(process_artwork, artwork): artwork
                for artwork in chunk
            }
            for future in as_completed(futures):
                ok = future.result()
                if ok:
                    success += 1
                total += 1
                if total >= limit:
                    break

        last_row = chunk[-1]
        last_score = last_row.get("score")
        last_id = last_row.get("id")

        if total >= limit:
            break

        time.sleep(SLEEP_SEC)  # delay between batches

    print(f"\n{'=' * 65}")
    print(f"Done — processed: {total} | success: {success} | failed: {total - success}")
    if FAILED_ARTWORK_IDS:
        print(
            "\nArtwork IDs that failed DB writes after all retries "
            "(recheck in Supabase):"
        )
        for aid in sorted(FAILED_ARTWORK_IDS):
            print(f"  {aid}")


if __name__ == "__main__":
    main()
