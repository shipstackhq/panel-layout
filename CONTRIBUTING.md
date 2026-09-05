# Contributing

Thanks for considering a contribution to `@shipstack/panel-layout`.

## Issues

Please include a minimal reproduction (a code snippet or a link to a
sandbox) when filing a bug. Feature requests are welcome — open an issue
before sending a large PR so the approach can be discussed first.

## Pull requests

1. Fork the repo and create a branch off `main`.
2. Run `npm install`, then `npm run typecheck` and `npm run build` before
   opening the PR.
3. Keep PRs focused — one change per PR is easier to review and merge.
4. Describe the "why," not just the "what," in the PR description.

## Response times

This is a small, actively maintained project. Issues and PRs are reviewed
on a best-effort basis, typically within a week.

## Development

```sh
npm install
npm run dev      # tsup --watch
npm run typecheck
npm run build
```

There is no test suite yet — if you're adding non-trivial logic, a
reasonable test setup (e.g. Vitest) is a welcome contribution on its own.
