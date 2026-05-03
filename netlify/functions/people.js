/**
 * /api/people — read and write the family tree people array.
 *
 *   GET  /api/people            → { people: [...], savedAt: "..." }  (or { empty: true } if Blob is unseeded)
 *   PUT  /api/people            → save the array; requires X-Edit-Password header
 *
 * Storage: a single Netlify Blob `soy-agaci/people-current` holds the full array.
 * Each save also creates a timestamped snapshot `snapshot-<iso>` (last ~50 kept)
 * so we can roll back if someone wipes data accidentally.
 */
import { getStore } from "@netlify/blobs";

const STORE_NAME = "soy-agaci";
const KEY_CURRENT = "people-current";
const SNAPSHOT_PREFIX = "snapshot-";
const MAX_SNAPSHOTS = 50;

export default async (request) => {
  const store = getStore(STORE_NAME);

  if (request.method === "GET") {
    try {
      const data = await store.get(KEY_CURRENT, { type: "json" });
      if (!data) return Response.json({ empty: true });
      return Response.json(data);
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (request.method === "PUT") {
    const expected = Netlify.env.get("EDIT_PASSWORD");
    if (!expected) {
      return Response.json(
        { error: "EDIT_PASSWORD environment variable is not set on the server." },
        { status: 500 }
      );
    }
    const provided = request.headers.get("x-edit-password");
    if (provided !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || !Array.isArray(body.people)) {
      return Response.json(
        { error: "Body must be { people: [{ id, name, ... }, ...] }" },
        { status: 400 }
      );
    }
    if (body.people.length < 2) {
      // Sanity guard: tree always has at least Ahmet + Hatice. Block obvious wipes.
      return Response.json(
        { error: "Refusing to save: people array has fewer than 2 entries (looks like a wipe)" },
        { status: 400 }
      );
    }

    const savedAt = new Date().toISOString();
    const payload = { people: body.people, savedAt, count: body.people.length };

    // Save current
    await store.setJSON(KEY_CURRENT, payload);

    // Snapshot for rollback
    const snapKey = SNAPSHOT_PREFIX + savedAt.replace(/[:.]/g, "-");
    await store.setJSON(snapKey, payload);

    // Trim old snapshots (best-effort; non-fatal if it fails)
    try {
      const list = await store.list({ prefix: SNAPSHOT_PREFIX });
      const snapshots = (list.blobs || []).map((b) => b.key).sort().reverse();
      if (snapshots.length > MAX_SNAPSHOTS) {
        const toDelete = snapshots.slice(MAX_SNAPSHOTS);
        await Promise.all(toDelete.map((k) => store.delete(k)));
      }
    } catch (err) {
      console.warn("Snapshot cleanup failed:", err.message);
    }

    return Response.json({ ok: true, savedAt, count: body.people.length });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config = {
  path: "/api/people",
};
