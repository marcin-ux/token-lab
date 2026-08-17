# Product brief — Team access

**Owner:** Product
**Status:** Ready for build
**Target:** `docs/team-access.html`

---

## Why we're building this

Admins currently manage who has access to a workspace by emailing support. It takes a day and a half on average, and roughly a fifth of those requests are to remove someone who has already left the company. That delay is a security problem, not just an annoyance.

Admins should be able to see who has access, invite people, and revoke access themselves, without leaving the product.

## Who it's for

Workspace admins. Typically one or two per organisation, not power users, and usually doing this task under mild time pressure ("someone starts on Monday", "someone left today").

---

## What the user needs to be able to do

1. **See everyone who currently has access**, with their role and account status at a glance.
2. **Invite someone new** by email address, choosing their role.
3. **See invitations that haven't been accepted yet**, and tell at a glance which ones are going stale.
4. **Revoke someone's access**, with enough friction that it can't happen by accident.

---

## Screen content

### Invite form

- **Email address** — required. Validate format on blur.
- **Role** — select: Admin, Editor, Viewer. Defaults to Viewer.
- **Message to the invitee** — optional, multi-line, free text.
- Primary action: **Send invite**. Secondary action: **Cancel**.

### Member list

Each row shows the person's email, their role, and a **status**:

- **Active** — accepted and using the workspace.
- **Invited** — invitation sent, not yet accepted.
- **Expiring** — invitation sent more than 5 days ago and still unaccepted. This is not an error; it's a nudge that the admin may want to resend. It must read as distinct from both a healthy state and a failure state.
- **Suspended** — access revoked, retained for audit. Reads as a problem state.

Each row has a **Remove** action.

### Removing a member

Removal is destructive and irreversible, so it needs confirmation. Show a confirmation step that names the person being removed and states that the action cannot be undone. The confirming action must read visually as destructive — the admin should be able to tell it apart from a routine primary action without reading the label.

---

## Validation and error handling

- Invalid email format → the field enters an error state, with a message explaining what's wrong. Do not block typing; validate on blur and clear the error once it's valid.
- Email already has access → error state, message says so explicitly rather than
  "invalid input".
- Empty required field on submit → error state, and focus moves to the first field
  with a problem.

---

## Accessibility requirements

These are acceptance criteria, not nice-to-haves.

- Every error message is programmatically associated with its field, so a screen reader
  announces it when the field receives focus.
- Validation state is never communicated by colour alone — every error and status must also carry text.
- Every interactive element has a visible keyboard focus indicator.
- The confirmation step is reachable and dismissable by keyboard.
- Interactive targets meet the minimum target size.

---

## Constraints

- This is a static prototype of the presentation layer. Mock the member list and the "already has access" check with hard-coded data in the page — the existing members should be the same addresses that trigger that error.
- Must work in every brand and mode the product supports, with no visual regressions in any of them.
- Build it with the design system. Use `build/AGENT-BRIEF.md` as the source of available tokens.
- `npm run check` must pass.

---

## Out of scope

Bulk invites, role permission editing, audit log, SSO provisioning.