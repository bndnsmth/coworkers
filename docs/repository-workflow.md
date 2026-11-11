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
| `feature/shared-bots` | Based on private-app-sharing; invitations, discovery and member chat |
| `feature/shared-computer` | Based on shared-bots; scoped Browser/Terminal/Files/Apps/Activity |
| `deploy/production` | Currently deployed application source, plus this workflow document |
| `deploy/candidate` | All nine upstream commits, all four feature branches, and production configuration support; not deployed |
| `archive/production-2026-11-11` | Exact deployed-source checkpoint `8c7eb51` |
| `archive/standalone-main` | Original standalone main `ae88463` |
| `integrate/upstream-2026-11-11` | Preserved integration and permission reconciliation history |

Appearance and private-app-sharing can be reviewed independently. The other
sharing branches are stacked: compare shared-bots against private-app-sharing,
and shared-computer against shared-bots. Do not submit the combined deployment
branch upstream. No upstream pull requests were opened during the migration.

## Current production record

- Host: <https://bots.bndnsmth.app>
- Cloudflare account: `cb7da3b78621686797c6fa870a606975`
- Worker name: `coworkers`
- Live version: `df4a0fce-51f5-4c86-bd39-03a2f5f07f76`, verified at 100% traffic
- Source checkpoint: `8c7eb51b347b821507cc9e065ef76c07e9a97bfa`

The migration performed no Worker deployment, storage migration, Access policy
change, binding replacement, or resource creation/deletion. Production retains
its existing Durable Object classes and namespaces. A GitHub rename does not
move the Cloudflare data.

`coworkers.deploy.json` and `.dev.vars.production` remain ignored and local.
The candidate keeps the same account/domain configuration support. Never put
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

Submit Appearance and private-app-sharing against upstream `main`. Submit the
dependent sharing branches after their prerequisites land, rebasing each onto
the accepted upstream version so its PR contains only the remaining feature.
Keep production composition on the deployment line, not on `main`.

## Compose and promote a release

`deploy/candidate` already combines the four branches. Its application source
was compared byte-for-byte with the validated integration before recording the
old production commit as an ancestor. It can be promoted by fast-forward when
the release is actually ready.

For subsequent updates, merge upstream and the relevant feature branches into
the candidate, resolve conflicts there, and run:

```bash
pnpm test
pnpm typecheck
pnpm build --mode production
pnpm exec cf deploy --dry-run --prebuilt --mode production
```

Deploy the reviewed candidate using the existing local production inputs.
Only after the deployment succeeds should `deploy/production` advance to that
exact candidate commit. Record the resulting Worker version here. Keep the
previous production reference for recovery; do not force-push either deployment
branch. Preserve the Worker name, account, Durable Object classes and bindings.

When upstream accepts a feature, reconcile the accepted implementation on the
candidate and verify it before retiring its feature branch. Upstream may squash
or rework a PR, so shared Git ancestry alone is not proof that behavior matches.

## Validation and recovery from this migration

Each feature branch passed TypeScript and its available test suite. The full
composition passed 439 tests, TypeScript, a production build and a prebuilt
production dry run. Chromium checks passed desktop/mobile-width Appearance,
first paint, saved preferences, OS changes, menus, file trees/diffs, dark
terminal, and offline fallback, with no browser exceptions.

Two-real-identity sharing acceptance and native iOS/Android launch checks remain
pending. The new connected services were not exercised against live accounts.
The candidate is saved separately from production for that reason.

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
worktree is `/mnt/data/Dev/oss/coworkers-contributions`, on `deploy/candidate`.
