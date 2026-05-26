#!/usr/bin/env python3
"""Fix placeholder artist slugs (artist-*) to name-based ASCII slugs."""

import os
import re
import subprocess
import sys

try:
    from unidecode import unidecode
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "unidecode"])
    from unidecode import unidecode

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://froigstrpvutwqtqikzt.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


def make_slug(name: str) -> str:
    slug = unidecode(name).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug


def main() -> None:
    if not SUPABASE_KEY:
        print("Error: SUPABASE_SERVICE_KEY is not set.", file=sys.stderr)
        sys.exit(1)

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    response = client.table("artists").select("id,name,slug").like("slug", "artist-%").execute()
    rows = response.data or []

    fixed_count = 0
    for row in rows:
        artist_id = row["id"]
        name = row.get("name") or ""
        old_slug = row.get("slug") or ""

        base = make_slug(name)
        if not base:
            print(f"Skip (empty slug from name): id={artist_id} name={name!r}", file=sys.stderr)
            continue

        new_slug = base
        suffix = 2
        while True:
            check = (
                client.table("artists")
                .select("id")
                .eq("slug", new_slug)
                .neq("id", artist_id)
                .limit(1)
                .execute()
            )
            if not check.data:
                break
            new_slug = f"{base}-{suffix}"
            suffix += 1

        if new_slug == old_slug:
            continue

        client.table("artists").update({"slug": new_slug}).eq("id", artist_id).execute()
        print(f"Fixed: {name} -> {new_slug}")
        fixed_count += 1

    print(f"Total fixed: {fixed_count}")


if __name__ == "__main__":
    main()
