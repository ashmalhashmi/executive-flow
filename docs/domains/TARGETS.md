# Domain: Targets

A target is an outcome with the operator's deadline. The identity statement names the person they are becoming. Favorable actions are the small repeats they keep doing until that target is achieved.

This follows identity-based habits: each completed action is a vote for the identity. Repetition is the neuroplasticity piece — the same favorable action, done again, strengthens that path. The outcome is not marked done by a single vote. The operator marks the target achieved when it is actually reached.

## Touch first

| Layer | Paths |
|-------|--------|
| UI | `src/pages/Targets.jsx` |
| State | `TargetsContext` via `useTargetsExecutive` |
| Logic | `src/utils/targetEntries.js` |

## Storage

- Key: `executive_flow_targets`
- Snapshot field: `data.targets`
- No server route. Saving a target does not call a model.

## Do / don't

- **Do** keep actions small and repeatable. The vote count is the record of repetition.
- **Don't** treat this as Task Log. A task is a dated office item. A target stays open, with its identity and actions, until the operator achieves it.
