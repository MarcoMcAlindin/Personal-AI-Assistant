# VOS Email UI v1 -- Handoff

**Agent:** Mr. Blue
**Date:** 2026-03-22
**Branch:** `feature/blue/110-email-whitelist-autocomplete-push-tokens`
**Commit:** `9748b7f`

---

## What Was Built

A full Gmail-style email UI for `/web`. Three files changed, all within `/web/`.

### Files Changed

| File | Change |
|------|--------|
| `web/src/types/email.ts` | Expanded Email interface -- body/snippet optional, added date, source, relaxed status to string |
| `web/src/services/emailService.ts` | Added `fetchEmailBody` (lazy full body, falls back gracefully) and `rewriteEmail` (calls POST /email/rewrite with tone) |
| `web/src/components/cyan/EmailView.tsx` | Full rewrite -- see layout section below |

---

## Layout Architecture

The view is a flex column filling `100vh` with `overflow: hidden` on the root. No outer page scroll.

```
<div style="height:100vh; overflow:hidden">
  <header flex-shrink-0 />          -- fixed-height header strip
  <div flex-1 overflow-hidden>      -- two-panel body
    <EmailListPanel   w-35% overflow-y-auto />
    <EmailContentPane flex-1  overflow-y-auto />
    <WhitelistDrawer  absolute right-0 translate-x animation />
  </div>
</div>
```

On mobile (`isMobile=true`): `mobileShowContent` boolean toggles which panel is visible. A "Back to inbox" button appears in the content pane header when in mobile content view.

---

## Features Delivered

### Email List Panel
- Sender initials avatar with deterministic per-sender colour
- Unread: `text-[#DAE2FD] font-semibold`; read: `text-[#BBC9CD]`
- Selected row: `bg-[#00FFFF]/5` + `border-l-2 border-l-[#00FFFF]/60`
- Amber "Job Match" badge for `source="job_filter"` emails
- Cyan unread dot (absolute right)
- Relative date formatting (time today, "Yesterday", weekday, or short date)

### Email Content Pane
- 48px sender avatar (same deterministic colour)
- Sender name + `<email>` address parsed from RFC 5322 `From` header
- Full date formatted: "Sunday, 22 March 2026 at 22:45"
- Amber "Job Application Match" badge for job_filter source
- Reply / Forward buttons (cyan outline style) prefilling compose
- Body: HTML rendered via `dangerouslySetInnerHTML` in a white inner div (Gmail HTML renders cleanly), fallback to `whitespace-pre-wrap` plain text
- Loading spinner while `fetchEmailBody` is in flight
- Fallback: if backend returns empty body, shows `email.snippet` or `email.body` from the list response
- Attachment chips (Paperclip icon + filename + MIME subtype)
- Empty state: mail icon + "Select an email to read"

### Qwen Compose Assist
- "Write with Qwen" button inside compose textarea (bottom-right overlay)
- Inline collapsible panel: prompt textarea + tone selector (Professional / Casual / Formal)
- Calls `POST /email/rewrite` via `emailService.rewriteEmail(draft, tone)`
- Loading spinner on Generate button; replaces compose body on success
- On error: compose body left untouched

### Whitelist Drawer
- Slide-in from right via `translate-x-full -> translate-x-0` CSS transition
- Renders over the content pane (absolute positioned, z-30)
- All prior whitelist logic preserved (search, dropdown, add, remove)

---

## Backend Dependency: `GET /email/{id}`

`fetchEmailBody` calls `GET /email/{id}`. This endpoint does NOT exist yet in `backend/app/api/v1/endpoints.py`. The service catches any non-OK response and returns `{ body: '', html: null, attachments: [] }`, falling back to the snippet. The UI is fully functional without this endpoint -- it just shows the snippet.

**Next step for another agent:** Implement `GET /email/{id}` in `endpoints.py` to return:
```json
{
  "body": "plain text body",
  "html": "<html>...",
  "attachments": [
    { "filename": "resume.pdf", "mimeType": "application/pdf", "data": "<base64>" }
  ]
}
```
The Gmail API call needed is `users.messages.get` with `format=full`, parsing `payload.parts` for body and attachments.

---

## Known Constraints
- ESLint v9 is installed but the repo has a `.eslintrc.json` (legacy format) -- `npm run lint` fails at the repo level. Pre-existing issue, not introduced here.
- TypeScript is not installed as a direct dep in `/web` -- type checking runs only during Vite build.
- No new npm packages were introduced.
- No em dashes used anywhere in UI strings.

---

## Testing Checklist
- [ ] Desktop: header fixed, list panel scrolls independently, content pane scrolls independently
- [ ] Whitelist drawer slides in/out without affecting layout
- [ ] Mobile: list shows first, click email shows content pane, Back button returns to list
- [ ] Select email: avatar + sender + date + body snippet renders
- [ ] Compose: "Write with Qwen" expands Qwen panel, tone toggles, Generate calls rewrite endpoint
- [ ] Job filter emails show amber "Job Match" / "Job Application Match" badges
- [ ] Reply prefills To + Re: Subject; Forward prefills Fwd: Subject
