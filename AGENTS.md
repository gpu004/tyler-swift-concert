# AGENTS.md

- `DESIGN.md` is the spec for both versions. Gameplay changes go there first, then into `typescript/` and `cpp/` together.
- `typescript/` must stay browser-only: no Node APIs in `src/`, no image assets, no runtime dependencies.
- Before pushing, run `npm run verify` in `typescript/` and `scripts/check.sh` in `cpp/`. Both must pass with zero warnings.
- Every lint is an error. Fix the code instead of disabling a rule; if a bad pattern recurs, add a rule.
- Don't edit `typescript/tools/oxlint/anti-slop/`; it is vendored from upstream at the commit in its `UPSTREAM.md`.
- No code comments.
- Conventional commit messages.
