---
name: unit-test
description: Applies the standard Vitest conventions for isolated unit tests of services, guards, pipes, interceptors, helpers, and other in-process application components.
---

# Unit Test

Defines unit-test conventions for isolated application components. Unit tests run
inside Vitest, live beside the target source file, and replace every dependency
with explicit mocks.

`assets/example/` contains a concrete `tasks.service.spec.ts` reference for a
service with a mocked repository dependency.

## File Placement

- Unit tests live next to the target file as `<file>.spec.ts`.
- Test files import the real unit under test and type-only dependencies needed
  for mocks or fixtures.

## Isolation Standards

- Do not boot a Nest application or testing module for plain service/helper tests.
- Do not connect to databases, network services, queues, or filesystem state.
- Replace each dependency with a small mock class or object built from `vi.fn()`.
- Create fresh unit and mock instances in `beforeEach`.
- Clear mocks in `afterEach` with `vi.clearAllMocks()`.

## Assertion Standards

- Test observable behavior: returned values, thrown errors, and dependency calls.
- Verify delegation arguments when the unit coordinates another dependency.
- Use domain types from `#src/modules/drizzle/drizzle.types` for realistic fixtures.
- Mock rejected dependencies with `mockRejectedValue` and assert the error
  propagates when the unit should not translate it.
- Keep tests focused on one behavior per `it` block.

## Reference Implementation

Use `assets/example/tasks.service.spec.ts` as the concrete reference for:

- mock dependency classes with `vi.fn()` methods
- realistic domain fixtures
- fresh instance setup in `beforeEach`
- `afterEach` mock cleanup
- service delegation tests for select, insert, update, and delete flows

When writing a new service unit test, adapt the reference to the target service's
methods and dependencies. When updating an existing test, preserve its current
shape and add only the cases required by the change.

## Run Tests

Run `bun run test:unit`.
