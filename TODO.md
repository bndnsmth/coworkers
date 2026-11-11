# TODO

## App protection and sharing

- [x] Make apps private by default without breaking bot access.
  - Bots should be able to access their own apps without needing a human's browser login.
  - Let users explicitly share apps and revoke sharing later.
  - Explore visibility controls such as owner-only, workspace members, and public/token-link sharing.
  - Evaluate Cloudflare Access as an additional protection layer, not a gate that prevents bots from using their apps.
  - Enforce protection consistently for pages, assets, app data/API calls, and live WebSockets.
  - Ensure setup and updates preserve the chosen protection settings.
  - Test that private apps reject unauthorized users while authorized bots continue to work.

### Deployment verification

- [x] Deploy sharing changes to `https://bots.bndnsmth.app`.
- [ ] Verify sharing with two real Access identities and an anonymous browser.
- Keep `/apps` on the Access bypass. The Worker now authenticates private entry
  URLs, checks every asset/API/socket request, and enforces explicit share links.
- Invitees using sign-in must also be allowed through the deployment's Access
  policy. See `docs/sharing.md`; no live policies have been changed.

## Shared bots

- [x] Allow users to explicitly share selected bots, including workspace-wide bots.
  - Keep personal bots private by default.
  - Define who can chat with, configure, and manage a shared bot.
  - Decide what is shared: conversations, memory, files, apps, routines, and connected credentials.
  - Prevent shared bots from exposing a user's private data or connections to other members.
  - Support revoking access and changing sharing settings.

### Shared computer follow-up

- [x] Give members the normal Browser, Terminal, Files, Apps, and Activity panel.
- [x] Let bot members edit app data and message the bot, without changing guest links.
- [x] Keep owner administration separate and recheck membership for every computer action.
- [x] Deploy the shared-computer follow-up (`4da6408d-e01a-49a5-9804-dcc614bdded5`, 100% traffic).
- [ ] Verify desktop/phone behavior with both real identities.
