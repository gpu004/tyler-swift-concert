# Upstream provenance

- Repository: https://github.com/dmmulroy/anti-slop
- Source commit: `13909c9e07590f5a85d93c62712259fe14a883f7`
- Copied `index.ts`, `rules/`, `shared/`, `vendor/` and `effect/` from `skills/install-anti-slop/assets/anti-slop` with `skills/install-anti-slop/scripts/install.mjs`. Upstream tests are not included.
- This project uses `oxlint` and `@oxlint/plugins` 1.88.0. The upstream checkout uses 1.78.0.
- The Effect plugin files are vendored but not registered, because this project has no Effect dependency.
