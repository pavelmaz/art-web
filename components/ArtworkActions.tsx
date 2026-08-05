"use client";

import { track } from "@vercel/analytics";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { getLibraryT } from "@/lib/library-translations";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/translations";

type Collection = { id: string; name: string };

/**
 * Favourite / Collect row for an artwork page.
 *
 * These pages are statically generated for ~109k works × 10 locales, so the
 * per-user state CANNOT be resolved on the server — doing so would force every
 * page dynamic. The buttons therefore render in their neutral state for
 * everyone (and for the crawler), then resolve the real state on the client
 * after hydration. Signed-out visitors are sent to /login with the current path
 * as `next`, which is exactly the moment we capture the email.
 */
export function ArtworkActions({
  artworkId,
  locale = "en",
}: {
  artworkId: string;
  locale?: Locale;
}) {
  const t = getLibraryT(locale);
  const pathname = usePathname();

  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inCollection, setInCollection] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Resolve session + this artwork's state once, after hydration.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      // getSession() reads the stored session locally; getUser() would add a
      // network round trip to /auth/v1/user on every artwork page view. The id
      // is only ever used for RLS-protected queries, so a tampered local
      // session grants nothing — the database is still the authority.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) {
        setReady(true);
        return;
      }
      const user = session.user;
      setUserId(user.id);

      const [fav, items] = await Promise.all([
        supabase
          .from("favorites")
          .select("artwork_id")
          .eq("user_id", user.id)
          .eq("artwork_id", artworkId)
          .maybeSingle(),
        supabase
          .from("collection_items")
          .select("collection_id, collections!inner(user_id)")
          .eq("artwork_id", artworkId)
          .eq("collections.user_id", user.id)
          .limit(1),
      ]);
      if (cancelled) return;
      setIsFav(Boolean(fav.data));
      setInCollection(Boolean(items.data?.length));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [artworkId]);

  const goToLogin = useCallback(() => {
    const next = pathname || "/";
    track("library_signin_prompt", { artwork: artworkId, locale });
    window.location.assign(
      `/login?next=${encodeURIComponent(next)}${locale === "en" ? "" : `&loc=${locale}`}`
    );
  }, [pathname, artworkId, locale]);

  const toggleFavourite = useCallback(async () => {
    if (!userId) {
      goToLogin();
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !isFav;
    setIsFav(next); // optimistic
    const supabase = createSupabaseBrowserClient();
    const { error } = next
      ? await supabase.from("favorites").insert({ user_id: userId, artwork_id: artworkId })
      : await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("artwork_id", artworkId);
    if (error) setIsFav(!next); // roll back
    else if (next) track("artwork_favourited", { artwork: artworkId, locale });
    setBusy(false);
  }, [userId, busy, isFav, artworkId, locale, goToLogin]);

  const openCollect = useCallback(() => {
    if (!userId) {
      goToLogin();
      return;
    }
    setModalOpen(true);
  }, [userId, goToLogin]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void toggleFavourite()}
          aria-pressed={isFav}
          aria-label={userId || !ready ? undefined : t.signInToSave}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-medium ${
            isFav ? "glass-accent" : "glass-secondary"
          }`}
        >
          <HeartIcon filled={isFav} />
          {isFav ? t.favourited : t.favourite}
        </button>

        <button
          type="button"
          onClick={openCollect}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-medium ${
            inCollection ? "glass-accent" : "glass-secondary"
          }`}
        >
          <PlusIcon />
          {inCollection ? t.collected : t.collect}
        </button>
      </div>

      {modalOpen && userId ? (
        <CollectModal
          artworkId={artworkId}
          userId={userId}
          locale={locale}
          onClose={(nowIn) => {
            setInCollection(nowIn);
            setModalOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Pick (or create) the collections this artwork belongs to. */
function CollectModal({
  artworkId,
  userId,
  locale,
  onClose,
}: {
  artworkId: string;
  userId: string;
  locale: Locale;
  onClose: (inAnyCollection: boolean) => void;
}) {
  const t = getLibraryT(locale);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: cols } = await supabase
        .from("collections")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const list = (cols ?? []) as Collection[];
      setCollections(list);
      if (list.length) {
        const { data: items } = await supabase
          .from("collection_items")
          .select("collection_id")
          .eq("artwork_id", artworkId)
          .in(
            "collection_id",
            list.map((c) => c.id)
          );
        setMemberOf(new Set((items ?? []).map((i) => i.collection_id as string)));
      }
      setLoading(false);
    })();
  }, [artworkId, userId]);

  const toggle = async (collectionId: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const has = memberOf.has(collectionId);
    const next = new Set(memberOf);
    if (has) next.delete(collectionId);
    else next.add(collectionId);
    setMemberOf(next); // optimistic

    const { error: err } = has
      ? await supabase
          .from("collection_items")
          .delete()
          .eq("collection_id", collectionId)
          .eq("artwork_id", artworkId)
      : await supabase
          .from("collection_items")
          .insert({ collection_id: collectionId, artwork_id: artworkId });
    if (err) {
      setMemberOf(memberOf); // roll back
      setError(err.message);
    } else if (!has) {
      track("artwork_collected", { artwork: artworkId, locale });
    }
    setBusy(false);
  };

  const createCollection = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: err } = await supabase
      .from("collections")
      .insert({ user_id: userId, name, cover_artwork_id: artworkId })
      .select("id, name")
      .single();
    if (err || !data) {
      setError(err?.message ?? "Could not create collection");
      setBusy(false);
      return;
    }
    await supabase
      .from("collection_items")
      .insert({ collection_id: data.id, artwork_id: artworkId });
    setCollections((c) => [data as Collection, ...c]);
    setMemberOf((m) => new Set(m).add((data as Collection).id));
    setNewName("");
    track("artwork_collected", { artwork: artworkId, locale });
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.collectTitle}
      onClick={() => onClose(memberOf.size > 0)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-[#1a1a1a]">{t.collectTitle}</h2>
        <p className="mt-1 text-xs text-[#6b6b6b]">{t.collectSubtitle}</p>

        <div className="mt-4 max-h-56 space-y-1 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-sm text-[#9a9a9a]">…</p>
          ) : collections.length === 0 ? (
            <p className="py-3 text-sm text-[#6b6b6b]">{t.noCollectionsYet}</p>
          ) : (
            collections.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-[#1a1a1a] hover:bg-[#faf9f7]"
              >
                <input
                  type="checkbox"
                  checked={memberOf.has(c.id)}
                  onChange={() => void toggle(c.id)}
                  className="size-4 accent-[#e4a23c]"
                />
                <span className="truncate">{c.name}</span>
              </label>
            ))
          )}
        </div>

        <div className="mt-4 flex gap-2 border-t border-[#e8e6e1] pt-4">
          <input
            type="text"
            value={newName}
            maxLength={80}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createCollection();
            }}
            placeholder={t.collectionNamePlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-[#dadada] px-3 py-2 text-sm focus:border-[#1a1a1a] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void createCollection()}
            disabled={busy || !newName.trim()}
            className="shrink-0 rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {t.create}
          </button>
        </div>

        {error ? <p className="mt-2 text-xs text-[#b42318]">{error}</p> : null}

        <button
          type="button"
          onClick={() => onClose(memberOf.size > 0)}
          className="mt-4 w-full rounded-lg border border-[#dadada] px-4 py-2.5 text-sm font-medium text-[#1a1a1a] hover:bg-[#fafafa]"
        >
          {t.done}
        </button>
      </div>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? "#e4a23c" : "none"} stroke={filled ? "#e4a23c" : "currentColor"} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
