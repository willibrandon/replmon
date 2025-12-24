# State Management Contracts

Internal TypeScript contracts for the Zustand store implementation.

## Files

- **store-types.ts**: Core type definitions for state, actions, and middleware
- **selectors.ts**: Selector signatures for derived state access

## Usage

These contracts define the public API of the store. During implementation:

1. Import types from contracts as the source of truth
2. Implement store slices to match the defined interfaces
3. Implement selectors to match the defined signatures
4. Tests verify compliance with contracts

## Notes

- These are design-time contracts, not runtime code
- Actual implementation will be in `src/store/`
- Existing types from `services/polling/types.ts` are re-exported, not duplicated
