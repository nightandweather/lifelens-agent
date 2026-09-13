## Problem and resulting behavior

Describe the user problem and what changes. Link any existing issue/discussion.

## Scope

Affected clients/regions/providers:
Shared contract or consent changes:
For a regional API, link official docs and describe coverage, units and fallback.

## Validation

List commands actually run and results. Mark unrelated checks N/A with a reason.
Include safe screenshots for UI changes. Distinguish fixture tests, live API tests
and physical-device verification. Follow CONTRIBUTING.md for relevant checks.

## Review checklist

- [ ] Read AGENTS.md and checked docs/SUBMISSION_FREEZE.md
- [ ] No credentials or private user data included
- [ ] Consent and confirmation boundaries preserved (or N/A explained)
- [ ] Source, timestamps, units, missing data and failure paths tested for provider changes (or N/A)
- [ ] Shared consumers and existing countries remain compatible (or N/A)
- [ ] Implemented, simulated and physically tested behavior labeled accurately
- [ ] Required CI passes and review comments are resolved before merge
