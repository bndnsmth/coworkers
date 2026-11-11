# Fork, contribution branches, and production

## Repository layout

- Fork: <https://github.com/bndnsmth/coworkers>
- Upstream: <https://github.com/fayazara/coworkers>
- Preserved standalone repository: <https://github.com/bndnsmth/coworkers-standalone>

`origin` points to the genuine fork, `upstream` to Fayaz's repository, and
`standalone` to the preserved repository. GitHub's default branch is `main`.
The fork migration changed GitHub and local Git organization, not the live
Cloudflare Worker or its data.

| Branch | Base / role |
| --- | --- |
| `main` | Clean upstream mirror; currently `6d2cf8d` |
| `feature/appearance` | Based on `main`; System/Light/Dark and themed workspace |
| `feature/private-app-sharing` | Based on `main`; private links, guest permissions, isolation and shared authorization backend |
| `feature/shared-bots` | Based on private-app-sharing; invitations, discovery, member chat and scoped Browser/Terminal/Files/Apps/Activity |
| `deploy/production` | All nine upstream commits, all three features, and production configuration support; the deployed release line and primary working branch |
| `archive/production-2026-11-11` | Exact deployed-source checkpoint `8c7eb51` |
| `archive/standalone-main` | Original standalone main `ae88463` |
| `integrate/upstream-2026-11-11` | Preserved integration and permission reconciliation history |

Appearance and private-app-sharing can be reviewed independently. Shared bots
builds on private-app-sharing and includes both chat and computer access in one
branch. Compare shared-bots against private-app-sharing. The former separate
shared-computer branch was consolidated into shared-bots without changing code.
Do not submit the combined deployment branch upstream.

### Upstream pull requests

All three PRs target upstream `main`:

- [#24 — Appearance settings and system-aware workspace theming](https://github.com/fayazara/coworkers/pull/24)
- [#23 — Private app sharing with scoped permissions and isolation](https://github.com/fayazara/coworkers/pull/23)
- [#25 — Shared bots with member chat and full computer access](https://github.com/fayazara/coworkers/pull/25)

Merge #23 before #25. Until the prerequisite lands, #25 includes its commits;
review the [incremental shared-bots comparison](https://github.com/bndnsmth/coworkers/compare/feature/private-app-sharing...feature/shared-bots)
for only the chat and computer additions. Appearance is independent and
cross-references the overlapping upstream theme proposals #20 and #22.

## Current production record

- Host: <https://bots.bndnsmth.app>
- Cloudflare account: `cb7da3b78621686797c6fa870a606975`
- Worker name: `coworkers`
- Live version: `a247cf65-34b5-4b3b-a82b-482f0ee072b1`, verified at 100% traffic
- Application source: `7146d56` (later documentation-only commits may follow)
- Previous release: `81fe2c9c-446b-4326-9d15-bced29801ebd`, source `15c507e`
- Accepted upstream integration: `8429c54`, deployed as
  `5b247091-b95b-40be-b784-af44e9471367` and smoke-tested by the owner
- Pre-integration version: `df4a0fce-51f5-4c86-bd39-03a2f5f07f76`, source `8c7eb51`

The initial repository migration performed no Worker deployment or resource
changes. The subsequent candidate deployment updated the existing Worker, and
the owner accepted its smoke test. Production retains the existing account,
domain, Durable Object classes and namespaces. The send/stop contrast fix was
then merged from `feature/appearance` and deployed from `deploy/production`.

All five initial sharing PR review findings were subsequently fixed and deployed
from `7146d56`. Private-app fixes are in `64e43e5` (#23): trusted server markers
for connected tools, correctly escaped session redirects, and account selection
in the app-sharing flow. Shared-chat fixes are in `11ffd01` (#25): standard
choice cards with member-scoped answers and working suggested-action buttons.
The shared-bots branch includes the prerequisite fixes. Review replies and fresh
Codex review requests are posted on both PRs.

Release checks: 458 tests, TypeScript, production build and prebuilt deployment
dry run passed. Post-deploy checks confirmed Access redirects for the main UI,
shared chat and agent routes, a 404 for an unknown app, and successful manifest
and service-worker responses. The production config and secrets files are
unchanged. Two-real-identity end-to-end acceptance remains unverified.

`coworkers.deploy.json` and `.dev.vars.production` remain ignored and local.
Production keeps the same account/domain configuration support. Never put
secret values or deployment credentials in a contribution branch.

## Daily contribution workflow

Update the upstream mirror:

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

For a new independent feature:

```bash
git switch -c feature/example main
# Implement, verify, commit, then:
git push -u origin feature/example
```

Keep each contribution updated on its feature branch. After private-app-sharing
lands, rebase shared-bots onto the accepted version so #25 contains only the
remaining feature changes, accounting for any upstream squash or rework.
Keep production composition on the deployment line, not on `main`.

## Compose and deploy a release

`deploy/production` is the single deployment line. The temporary
`deploy/candidate` branch was promoted after the owner's smoke test and removed.
Its commits remain in production history. The primary checkout stays on
`deploy/production`; feature work belongs on the relevant contribution branch.

For subsequent updates, merge upstream and the relevant feature branches into
`deploy/production`, resolve conflicts, and run:

```bash
pnpm test
pnpm typecheck
pnpm build --mode production
pnpm exec cf deploy --dry-run --prebuilt --mode production
```

Deploy the reviewed production commit using the existing local production
inputs. Record its source commit and resulting Worker version here after the
deployment succeeds. Keep the previous release reference for recovery; do not
force-push the production branch. Preserve the Worker name, account, Durable
Object classes and bindings. No permanent candidate branch is needed.

When upstream accepts a feature, reconcile the accepted implementation on the
production line and verify it before retiring its feature branch. Upstream may squash
or rework a PR, so shared Git ancestry alone is not proof that behavior matches.

## Validation and recovery from this migration

Each feature branch passed TypeScript and its available test suite. The full
composition passed 439 tests, TypeScript, a production build and a prebuilt
production dry run. Chromium checks passed desktop/mobile-width Appearance,
first paint, saved preferences, OS changes, menus, file trees/diffs, dark
terminal, and offline fallback, with no browser exceptions.

The owner smoke-tested the deployed integration and reported that everything
was working. Exhaustive two-real-identity sharing and native iOS/Android launch
checks were not performed by the agent. The new connected services were not
exercised against live accounts by the agent.

The follow-up ink-button fix was checked in Chromium at desktop and phone
widths in light and dark modes, including send, stop, hover and disabled states.
The production build passed. The fix lives on `feature/appearance` and is
merged into the production line.

The pre-existing `pnpm-workspace.yaml` edit contains unfinished build-approval
placeholders. It is preserved locally and was not committed. Validation used
the installed `node_modules/.bin/{tsc,vitest,cf}` executables to avoid pnpm's
automatic dependency installation mutating those settings. Resolve the build
approvals deliberately before a fresh dependency install. ESLint also has the
pre-existing TypeScript 7/typescript-eslint compatibility limitation.

Local recovery bundle and original merge/index/worktree snapshot:

`/mnt/data/Dev/oss/coworkers-migration-backup-20261111-104804/`

That directory is private (0700) and contains ignored deployment inputs. Do not
upload it. Git-only archive branches are pushed to the fork. The validation
worktree is `/mnt/data/Dev/oss/coworkers-contributions`, on `feature/appearance`.
