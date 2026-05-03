/**
 * /api/verify — check whether the supplied edit password is correct.
 * Used by the frontend's password modal to validate before opening edit mode,
 * so the user gets immediate feedback instead of "wrong password" only at
 * first save.
 *
 *   POST /api/verify     header X-Edit-Password: <pw>
 *     200 { ok: true }   → correct
 *     401 { error: ... } → wrong / missing
 *     500                → server-side EDIT_PASSWORD env var not set
 */
export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
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
  return Response.json({ ok: true });
};

export const config = {
  path: "/api/verify",
};
