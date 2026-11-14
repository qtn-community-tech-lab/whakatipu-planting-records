"use client";
import { useEffect, useState } from "react";

/**
 * What a server action returns for one `key` (what it reads, e.g. the site and part): `loading` until it
 * comes, `failed` when it couldn't be read (never an endless "Loading"), and `reload` to ask again.
 * A reply for an older key is dropped, so a quick change of site never shows the last one's data.
 */
export function useLoad<T>(key: string, load: () => Promise<T>) {
  const [loaded, setLoaded] = useState<{ key: string; data: T | null; failed: boolean } | null>(null);
  const [reads, setReads] = useState(0);
  useEffect(() => {
    let live = true;
    load()
      .then((data) => { if (live) setLoaded({ key, data, failed: false }); })
      .catch(() => { if (live) setLoaded({ key, data: null, failed: true }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` says what `load` reads; a new function each render isn't a new read
  }, [key, reads]);
  const now = loaded?.key === key ? loaded : undefined;
  return {
    loading: !now, failed: !!now?.failed, data: now?.data ?? null,
    reload: () => { setLoaded(null); setReads((n) => n + 1); },
  };
}
