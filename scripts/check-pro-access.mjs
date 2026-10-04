// Daily guard for paid Fine Art Pro access (.github/workflows/check-pro-access.yml).
//
// Fails — so GitHub emails the repo owner — when a paid subscription has sat
// for hours on an account nobody has ever signed in to. That account is the
// placeholder the Stripe webhook creates for a guest checkout's email; if the
// buyer then signs in under a different email and the thank-you page couldn't
// link it, they see "Free" after paying (30 Sep and 4 Oct 2026). Fix by hand:
// move stripe_customer_id + subscription_status to the account they really
// use (lib/fineart-pro-success.ts explains the claim rules).
//
//   node --env-file=.env.local scripts/check-pro-access.mjs

const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY");

// Give a buyer time to come back and sign in before calling it stranded.
const STALE_HOURS = Number(process.env.STALE_HOURS ?? 6);
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function getJson(path) {
  const res = await fetch(`${SB}${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

const paid = await getJson(
  "/rest/v1/profiles?select=id,stripe_customer_id&subscription_status=eq.active&stripe_customer_id=not.is.null"
);

const stranded = [];
for (const profile of paid) {
  const user = await getJson(`/auth/v1/admin/users/${profile.id}`);
  const ageHours = (Date.now() - Date.parse(user.created_at)) / 3_600_000;
  if (!user.last_sign_in_at && ageHours >= STALE_HOURS) {
    stranded.push({ email: user.email, customer: profile.stripe_customer_id, created: user.created_at });
  }
}

console.log(`${paid.length} paid accounts checked, ${stranded.length} never signed in to`);
for (const s of stranded) {
  console.log(`  STRANDED: ${s.email} (Stripe ${s.customer}, paid ${s.created}) — look for an account created minutes later that is still Free`);
}
if (stranded.length) process.exit(1);
