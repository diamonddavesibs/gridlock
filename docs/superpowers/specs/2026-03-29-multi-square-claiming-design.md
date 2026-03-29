# Multi-Square Claiming Design

**Date:** 2026-03-29
**Status:** Approved

## Problem

The current `JoinForm` allows a guest to claim exactly one square. After claiming, the form replaces itself with a static "Square claimed! Good luck 🎉" message — the user cannot claim more squares without refreshing the page and re-entering their name and contact info.

## Goal

Allow guests to claim multiple squares in a single page visit without re-entering their details between claims.

## Constraints

- No limit on squares per person (first-come, first-served up to 100 total)
- Session persists within the current page visit only (React state — no localStorage)
- Pool status must be `open` to claim (unchanged)

## UX Flow

### Phase 1 — Enter details (unchanged)
User enters name and contact info (email or SMS). The grid is visible. No square is selected yet.

### Phase 2 — Square selected
User taps an empty square — it highlights in the grid. A "Claim (row, col)" button appears above the grid. Tapping the same square again deselects it (button disappears). Tapping a different empty square switches the selection. Only one square can be selected at a time.

### Phase 3 — After first claim (form collapses)
After a square is successfully claimed via the API, the name/contact fields collapse into a small "Claiming as: [name]" label (read-only). The "Claim" button and grid remain active. A small success hint ("✓ (row, col) claimed — tap a square to select another") replaces the old "Square claimed!" terminal state. An "I'm finished" button appears below the grid.

The user can keep selecting and claiming squares. Each claim fires the existing `POST /api/pools/:id/squares` endpoint. The grid updates in real-time via the existing Supabase subscription.

### Phase 4 — Confirmation screen
When the user clicks "I'm finished", the grid is hidden and a confirmation screen is shown listing every square they claimed (e.g. "Row 2, Col 4"). Two buttons are shown:
- **Looks good — I'm done! 🎉** → advances to Phase 5
- **← Go back and claim more** → returns to Phase 3

### Phase 5 — Done screen
Displays the final success message: "Good luck, [name]! You've claimed N square(s)." This replaces the current static "Square claimed!" message.

## State Changes in `JoinForm`

| Current state | Replaced/extended by |
|---|---|
| `selectedSquare: {row,col} \| null` | unchanged — tracks the currently highlighted (not yet claimed) square; resets to `null` after each successful claim |
| `claimed: boolean` | removed |
| *(new)* `claimedSquares: {row,col}[]` | list of successfully claimed squares, grows with each claim |
| *(new)* `phase: 'form' \| 'claiming' \| 'confirm' \| 'done'` | `'form'` = no claims yet (name/contact visible); `'claiming'` = at least one claim made (form collapsed); `'confirm'` = "I'm finished" tapped; `'done'` = confirmed |

## Component Changes

Only `JoinForm` (`app/join/[token]/JoinForm.tsx`) needs to change. `Grid`, `GridSquare`, and all API routes are unchanged.

`GridSquare` already supports deselection implicitly — clicking a claimed square is a no-op (`!isClaimed && onClaim?.(row, col)`). The parent just needs to pass `null` when the same square is tapped again (toggle logic lives in `JoinForm`).

## API

No API changes. Each square is claimed individually via the existing `POST /api/pools/:id/squares` endpoint. There is no batch endpoint.

## Error Handling

If a claim API call fails (e.g. the square was taken by someone else between selection and confirm), show an inline error and deselect the square. The user can pick another. This is the existing behavior — no change needed.
