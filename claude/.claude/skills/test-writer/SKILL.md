---
name: test-writer
description: Write comprehensive tests with emphasis on ALL error paths, edge cases, and regression coverage for code changes
---

# Test Writer Skill

Generate comprehensive tests for code changes, with emphasis on error paths and edge cases.

## When to trigger

- User asks: "write tests", "add tests for this", "test this"
- After implementing new functionality
- When reviewing code with missing test coverage

## Instructions

1. **Analyze the code:**
   - Read the file/function to test
   - Identify: inputs, outputs, side effects, dependencies, error conditions
   - Check existing tests to match style/framework
   - List all possible error returns/throws

2. **Determine test type:**
   - **Unit:** Pure functions, isolated logic
   - **Integration:** Component + hooks, API + DB interactions
   - **E2E:** Full user flows

3. **Generate test cases (in priority order):**

   a. **Error paths (CRITICAL):**
      - Test EVERY error return/throw variant
      - Verify error types/messages remain stable
      - Why: Internal implementation changes break error handling
      - Error tests act as regression tests for refactors
      - Examples:
        - Rust: Test all `Err(...)` variants in Result
        - TypeScript: Test all thrown error types
        - Go: Test all error return values
        - Python: Test all raised exceptions

   b. **Happy path:**
      - Expected behavior with valid inputs
      - Primary use cases

   c. **Edge cases:**
      - Empty, null, undefined, zero
      - Boundary values (min, max, off-by-one)
      - Large inputs, deeply nested data
      - Special characters, unicode

   d. **State changes:**
      - Before/after assertions
      - Side effects verification

   e. **Concurrency/timing:**
      - Race conditions (if applicable)
      - Timeout scenarios

4. **Test structure (AAA pattern):**
   ```typescript
   describe('functionName', () => {
     it('should [expected behavior] when [condition]', () => {
       // Arrange: Setup
       const input = ...

       // Act: Execute
       const result = functionName(input)

       // Assert: Verify
       expect(result).toBe(expected)
     })
   })
   ```

5. **Test naming:**
   - Describe behavior, not implementation
   - `should return user when valid ID provided`
   - `should return NotFoundError when user does not exist`
   - `should throw ValidationError when email is invalid`
   - `should handle empty array without errors`

6. **Error testing examples:**

   **Rust:**
   ```rust
   #[test]
   fn should_return_not_found_error_when_user_missing() {
       let result = get_user(999);
       assert!(matches!(result, Err(UserError::NotFound(_))));
   }

   #[test]
   fn should_return_validation_error_for_negative_id() {
       let result = get_user(-1);
       assert!(matches!(result, Err(UserError::InvalidId(_))));
   }
   ```

   **TypeScript:**
   ```typescript
   it('should throw NotFoundError when user does not exist', () => {
     expect(() => getUser(999)).toThrow(NotFoundError);
     expect(() => getUser(999)).toThrow('User not found');
   });
   ```

7. **Coverage checklist:**
   - [ ] ALL error paths tested (every Err/throw variant)
   - [ ] Error messages/types verified (API contract stability)
   - [ ] All code branches executed
   - [ ] Edge cases covered
   - [ ] Mocks for external dependencies
   - [ ] State changes verified
   - [ ] No flaky tests (consistent results)

## Framework detection

- Detect from imports: Jest, Vitest, pytest, RSpec, cargo test, etc.
- Match existing test patterns in codebase
- Use same mocking/assertion libraries
- Follow project conventions (file naming, directory structure)

## Tool access
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Bash

## Output

- Write complete test file or add to existing tests
- Include necessary imports and setup/teardown
- Group related tests in describe/context blocks
- Add comments only for non-obvious test logic
- Prioritize error path tests first
- Ensure tests fail when implementation breaks

## Principles

- Error tests are regression tests - treat them as API contracts
- If a function can return 5 different errors, write 5 error tests
- Test what users observe, not internal implementation
- Make tests readable - they're documentation
- Fast, isolated, deterministic tests only
