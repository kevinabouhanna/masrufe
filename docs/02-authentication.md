# 2. Authentication

Masrufe uses passwordless **magic-link** email and **Google** sign-in. Both are
handled by Supabase Auth — there's no auth code to host yourself.

## Email (magic link)

Email auth is **on by default** in Supabase, which is all the magic link needs.
For low volume the built-in email sender works; for production you may want to
add your own SMTP under **Authentication → Emails**.

## Google

1. In **Google Cloud Console → APIs & Services → Credentials**, create an
   **OAuth client ID** of type *Web application*.
2. Add this **Authorized redirect URI**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   (find the exact value in Supabase under **Authentication → Providers → Google**)
3. Copy the **Client ID** and **Client secret**.
4. In Supabase → **Authentication → Providers → Google**, enable it and paste the
   Client ID + secret. Save.

## Redirect URLs (important)

After a magic link or Google login, Supabase redirects back to your app at
`/app.html`. You must allow-list those URLs or login will fail.

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** your deployed origin, e.g. `https://masrufe.vercel.app`
- **Redirect URLs** (add each):
  ```
  https://masrufe.vercel.app/app.html
  http://localhost:4321/app.html        ← for local testing
  ```

Use whatever origin you actually deploy to. If you test locally with a different
port, add that one too.

## How it flows in the app

- The landing page (`index.html`) opens an auth modal. Magic link calls
  `signInWithOtp({ emailRedirectTo: <origin>/app.html })`; Google calls
  `signInWithOAuth({ provider: 'google', redirectTo: <origin>/app.html })`.
- `app.html` checks the session on load. **No session → redirect to `/`.** When
  signed in, it shows the user's email and a sign-out button, and every database
  request carries the user's JWT so RLS scopes data to that user.

→ Next: [Configuration](03-configuration.md)
