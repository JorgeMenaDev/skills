# Private deploys

Use this when the human asks to deploy work that is internal, confidential or not yet public.

- **Vercel's first deploy of a new project goes to production**, and production gets a public
  `<project>.vercel.app` alias. The default protection (`all_except_custom_domains`) leaves that alias open.
  Set protection on every deployment **before** the first deploy:

  ```bash
  vercel link --yes --project <name> --scope <personal-team>
  printf '{"ssoProtection":{"deploymentType":"all"}}' > /tmp/sso.json
  vercel api -X PATCH "/v9/projects/<projectId>?teamId=<teamId>" --input /tmp/sso.json --raw
  vercel deploy --yes
  ```

  `projectId` is in `.vercel/project.json`. If the alias was already created, remove it with
  `vercel alias rm <project>.vercel.app --yes` and tell the human how long it was public.
- Link to the human's personal team rather than a shared company team, unless told otherwise.
- `vercel link` writes `.env.local` with a `VERCEL_OIDC_TOKEN`: keep `.env*` and `.vercel` in `.gitignore`.
- **Verify logged out**: `curl -s -o /dev/null -w '%{http_code}' <url>` must return `302` (to
  `vercel.com/sso-api`) for the deployment URL, the branch alias and a video file, and `404` for any removed
  alias. Report the protected URL with "sign in to Vercel to open it".
- Pushing to GitHub: create the repo with `--private` and confirm `visibility` is `PRIVATE` before
  reporting.
