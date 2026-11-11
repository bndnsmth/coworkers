import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it } from "vitest"
import { AppStore } from "./app-store"
import { PRIVATE_BOT } from "@/lib/sharing"

const databases: DatabaseSync[] = []
function fixture(legacy = false) {
  const db = new DatabaseSync(":memory:")
  databases.push(db)
  if (legacy)
    db.exec(`CREATE TABLE app_links (token TEXT PRIMARY KEY, slug TEXT NOT NULL, label TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'edit', owner INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
    INSERT INTO app_links VALUES ('old-owner', 'trip', 'You', 'edit', 1, 1);
    INSERT INTO app_links VALUES ('old-share', 'trip', 'Guest', 'edit', 0, 1);`)
  const sql = {
    exec(query: string, ...args: (string | number | null)[]) {
      const statement = db.prepare(query)
      if (statement.columns().length) {
        const rows = statement.all(...args)
        return { toArray: () => rows }
      }
      statement.run(...args)
      return { toArray: () => [] }
    },
  } as unknown as SqlStorage
  const store = new AppStore(
    sql,
    (slug, token) => `/apps/owner/bot/${slug}/${token}/`
  )
  store.init()
  store.save({ slug: "trip", name: "Trip", description: "", hasServer: false })
  return { store, db }
}
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe("durable app sharing", () => {
  it("creates only an authenticated owner link for a new app", () => {
    const { store } = fixture()
    expect(store.links("trip")).toMatchObject([
      { owner: true, audience: "owner", mode: "edit" },
    ])
  })
  it("migrates existing owner links without silently changing explicit shares", () => {
    const { store } = fixture(true)
    expect(store.findLink("trip", "old-owner")).toMatchObject({
      audience: "owner",
      canMessage: true,
    })
    expect(store.findLink("trip", "old-share")).toMatchObject({
      audience: "link",
      mode: "edit",
      canMessage: false,
    })
    store.init() // migration is safe after a restart
    expect(store.links("trip")).toHaveLength(2)
  })
  it("preserves permissions and share URLs across republishing", () => {
    const { store } = fixture()
    const link = store.createLink("trip", "Guest", "view", false, {
      audience: "email",
      email: "guest@test.com",
      canMessage: false,
    })
    store.save({
      slug: "trip",
      name: "Trip v2",
      description: "new",
      hasServer: true,
    })
    expect(store.findLink("trip", link.token)).toEqual(link)
  })
  it("revokes a parent and all its already-issued sessions", () => {
    const { store } = fixture()
    const link = store.createLink("trip", "Guest", "view", false, {
      audience: "email",
      email: "guest@test.com",
    })
    const session = store.createLink("trip", "Guest", "view", false, {
      audience: "session",
      parentToken: link.token,
      expiresAt: Date.now() + 10000,
    })
    store.revokeLink(link.token)
    expect(store.findLink("trip", session.token)).toBeNull()
    expect(store.findLink("trip", link.token)).toBeNull()
  })
  it("rejects expired or orphan sessions even before cleanup", () => {
    const { store, db } = fixture()
    const link = store.ownerLink("trip")
    const session = store.createLink("trip", "Guest", "view", false, {
      audience: "session",
      parentToken: link.token,
      expiresAt: Date.now() + 10000,
    })
    db.prepare("UPDATE app_links SET expires_at = ? WHERE token = ?").run(
      Date.now() - 1,
      session.token
    )
    expect(store.findLink("trip", session.token)).toBeNull()
    db.prepare(
      "UPDATE app_links SET expires_at = NULL, parent_token = 'missing' WHERE token = ?"
    ).run(session.token)
    expect(store.findLink("trip", session.token)).toBeNull()
  })
  it("rotates private owner links without leaving old sessions usable", () => {
    const { store } = fixture()
    const owner = store.ownerLink("trip")
    const session = store.createLink("trip", "You", "edit", false, {
      audience: "session",
      parentToken: owner.token,
      expiresAt: Date.now() + 10000,
    })
    store.revokeLink(owner.token)
    expect(store.ownerLink("trip").token).not.toBe(owner.token)
    expect(store.findLink("trip", session.token)).toBeNull()
  })
  it("scopes tokens to one app and retains a separate private bot-service credential", () => {
    const { store } = fixture()
    const service = store.botLink("trip")
    expect(service.owner).toBe(false)
    expect(service.audience).toBe("bot")
    expect(store.botLink("trip").token).toBe(service.token)
    expect(store.findLink("other", service.token)).toBeNull()
  })
  it("bootstraps owner sessions only after login; members can edit and message", () => {
    const { store } = fixture()
    const token = store.ownerLink("trip").token
    const sharing = {
      ...PRIVATE_BOT,
      isolated: true,
      emails: ["wife@test.com"],
    }
    expect(store.authorize("trip", token, null, "owner", sharing)).toBeNull()
    expect(
      store.authorize(
        "trip",
        token,
        { id: "other", email: "other@test.com" },
        "owner",
        sharing
      )
    ).toBeNull()
    const owner = store.authorize(
      "trip",
      token,
      { id: "owner", email: "owner@test.com" },
      "owner",
      sharing
    )!
    expect(owner).toMatchObject({
      audience: "session",
      parentToken: token,
      mode: "edit",
      canMessage: true,
    })
    expect(owner.token).not.toBe(token)
    const member = store.authorize(
      "trip",
      token,
      { id: "wife", email: "wife@test.com" },
      "owner",
      sharing
    )!
    expect(member).toMatchObject({
      mode: "edit",
      canMessage: true,
      viewerEmail: "wife@test.com",
    })
    expect(
      store.authorize("trip", member.token, null, "owner", sharing)
    ).not.toBeNull()
    expect(
      store.authorize("trip", member.token, null, "owner", PRIVATE_BOT)
    ).toBeNull()
    expect(
      store.authorize("trip", owner.token, null, "owner", PRIVATE_BOT)
    ).not.toBeNull()
  })
  it("upgrades old member sessions but never upgrades an explicit external share", () => {
    const { store } = fixture()
    const sharing = {
      ...PRIVATE_BOT,
      isolated: true,
      emails: ["wife@test.com"],
    }
    const member = store.createLink("trip", "wife@test.com", "view", false, {
      audience: "session",
      parentToken: store.ownerLink("trip").token,
      viewerEmail: "wife@test.com",
      canMessage: false,
      expiresAt: Date.now() + 10_000,
    })
    expect(
      store.authorize("trip", member.token, null, "owner", sharing)
    ).toMatchObject({ mode: "edit", canMessage: true })
    expect(
      store.authorize("trip", member.token, null, "owner", PRIVATE_BOT)
    ).toBeNull()
    const external = store.createLink("trip", "Guest", "view", false, {
      audience: "link",
      canMessage: false,
    })
    expect(
      store.authorize(
        "trip",
        external.token,
        { id: "wife", email: "wife@test.com" },
        "owner",
        sharing
      )
    ).toMatchObject({ mode: "view", canMessage: false })
    const email = store.createLink("trip", "Wife guest link", "view", false, {
      audience: "email",
      email: "wife@test.com",
      canMessage: false,
    })
    const session = store.authorize(
      "trip",
      email.token,
      { id: "wife", email: "wife@test.com" },
      "owner",
      sharing
    )!
    expect(session).toMatchObject({ mode: "view", canMessage: false })
    expect(
      store.authorize("trip", session.token, null, "owner", sharing)
    ).toMatchObject({ mode: "view", canMessage: false })
  })
  it("binds email sessions to the invited identity and rechecks parent revocation", () => {
    const { store } = fixture()
    const link = store.createLink("trip", "Guest", "view", false, {
      audience: "email",
      email: "guest@test.com",
    })
    expect(
      store.authorize(
        "trip",
        link.token,
        { id: "stranger", email: "stranger@test.com" },
        "owner",
        PRIVATE_BOT
      )
    ).toBeNull()
    const session = store.authorize(
      "trip",
      link.token,
      { id: "guest", email: "guest@test.com" },
      "owner",
      PRIVATE_BOT
    )!
    expect(
      store.authorize("trip", session.token, null, "owner", PRIVATE_BOT)
    ).not.toBeNull()
    store.revokeLink(link.token)
    expect(
      store.authorize("trip", session.token, null, "owner", PRIVATE_BOT)
    ).toBeNull()
  })
})
