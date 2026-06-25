# QA Task Specification

## Goal
Systematically test the mojing-app (墨境) novel writing application, ensuring all features work correctly, no regressions exist, and the product is stable for production.

## Scope
- Full functional testing of all 9 modules (Project Mgmt, Editor, Chapter Mgmt, AI, Brainstorm, Compliance, Self-check, Export, Layout)
- Re-verification of 17 previously identified bugs
- Exploratory testing for new issues
- Build/TypeScript verification
- Data integrity checks (localStorage)
- Browser compatibility assessment

## Non-Goals
- Writing or modifying code
- Architecture decisions
- Performance benchmarking
- Security penetration testing

## Success Criteria
1. All 25 test cases in test-plan-v1.md pass or have documented exceptions
2. Previously found P0 bugs verified (still open or confirmed fixed)
3. Build completes with no TypeScript errors
4. Dev server starts without errors
5. Test report updated with current status
