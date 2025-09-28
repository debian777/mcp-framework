# AI Improvement Starter (Single-File Import)

This single Markdown file gives an AI agent (e.g., GitHub Copilot Chat) everything it needs to **create or adopt** the following in your repo:
- Kilo-like modes: **TODOs / Architect / Code / Debug**
- Adaptation instructions (detect your tech stack and commands)
- Prioritization with a scoring rubric and a tiny scorer script
- Issue template and prompts

**How to use (agent-friendly):**
1. Open this file in your repository root (or paste it into a new `AI-IMPROVEMENT-STARTER.md`).
2. In Copilot Chat say: **“Apply the AI Improvement Starter. Create or update the files from the code blocks. If a target file already exists, merge minimally.”**
3. Ask it to: **“Run a sweep using `prompts/ai-improvements.md`, then score with `python3 scripts/score-improvements.py` and update `TODO.md` and `improvements.yaml`.”**

---

## Agent Playbook (read me aloud)
- Detect the project’s primary stack(s) (Python, Node, etc.) and infer `test`, `lint`, `typecheck`, `fmt` commands.
- If commands are missing, **bootstrap the smallest viable setup** and stop after the first green run.
- Always propose an **ADR** for non-trivial changes before coding.
- Keep diffs **small and localized**; avoid churn.
- Update `TODO.md` with a **Now / Next / Later** plan (≤7 items) and scores using the rubric below.
- Write items to `improvements.yaml`, then run the scorer script and re-order TODOs by score.
- Use **Conventional Commits** for all suggested commit messages.

**Scoring rubric (0–5 each; Effort subtracts):**
Score = `0.4*Impact + 0.2*RiskReduction + 0.15*DevFriction + 0.1*Confidence - 0.15*Effort`  
Buckets: **P0 (≥3.5)** Now, **P1 (3.0–3.49)** Next, **P2 (2.5–2.99)** Later, **P3 (<2.5)** Backlog.

---

## Files to create/adopt

### 1) `.vscode/copilot-modes.code-snippets`
<!-- file: .vscode/copilot-modes.code-snippets -->
```json
{
  "Copilot TODOs Mode": {
    "prefix": "mode-todos",
    "body": [
      "You are my TODO/Roadmap manager for this repo.",
      "- Read the workspace and propose a short, prioritized checklist (≤7 items) with acceptance criteria.",
      "- Use terse, testable wording. Group by Now / Next / Later (highest score first).",
      "- Compute scores per item using the rubric in CONTRIBUTING.md (0–5 each; Effort subtracts).",
      "- Maintain a running log in TODO.md (create/update).",
      "Output:",
      "1) Updated TODO.md",
      "2) The single next command I should run"
    ],
    "description": "Kilo-like TODOs mode with scoring"
  },
  "Copilot Architect Mode": {
    "prefix": "mode-architect",
    "body": [
      "Architect first, code second.",
      "- Read relevant files. Summarize behavior and constraints.",
      "- Propose a tiny design: goals, risks, interfaces, data shapes, invariants, tests.",
      "- Emit an ADR as docs/adr/NNN-<slug>.md (status: proposed). Keep it under 80 lines.",
      "- End with: Impacted files + a smallest-diff plan (≤3 diffs).",
      "Output only:",
      "1) ADR file content",
      "2) Minimal diff plan (filenames + short bullet per change)"
    ],
    "description": "Architect mode"
  },
  "Copilot Code Mode": {
    "prefix": "mode-code",
    "body": [
      "Make the smallest change that satisfies the Architect plan.",
      "Rules:",
      "- Add/adjust tests first if required, then code.",
      "- Keep edits minimal and local.",
      "- Preserve existing public interfaces unless the ADR says otherwise.",
      "Output:",
      "1) Patched file contents (only files that change)",
      "2) Exact commands to run tests/lint",
      "3) Commit message (Conventional Commit)"
    ],
    "description": "Code mode"
  },
  "Copilot Debug Mode": {
    "prefix": "mode-debug",
    "body": [
      "You are a debugger.",
      "- Read the failing output I paste.",
      "- Identify root cause, not symptoms. Show the minimal reproduction path.",
      "- Propose ONE minimal patch and ONE follow-up test.",
      "Output:",
      "1) Hypothesis (≤3 bullets)",
      "2) Patch (only changed files)",
      "3) Test to add/adjust",
      "4) One-liner to verify (single command)"
    ],
    "description": "Debug mode"
  }
}
```

### 2) `.vscode/tasks.json`
<!-- file: .vscode/tasks.json -->
```json
{
  "version": "2.0.0",
  "tasks": [
    { "label": "test", "type": "shell", "command": "pytest -q || npm test -s || echo 'plug your test command here'", "problemMatcher": [] },
    { "label": "lint", "type": "shell", "command": "ruff check || eslint . || echo 'plug your linter here'", "problemMatcher": [] },
    { "label": "typecheck", "type": "shell", "command": "pyright || tsc --noEmit || echo 'plug your type checker here'", "problemMatcher": [] },
    { "label": "fmt", "type": "shell", "command": "ruff format || prettier -w . || echo 'plug your formatter here'", "problemMatcher": [] }
  ]
}
```

### 3) `docs/adr/000-template.md`
<!-- file: docs/adr/000-template.md -->
```md
# ADR NNN: <short-title>
Status: proposed
Date: <YYYY-MM-DD>

## Context
- <1–3 bullets of context>

## Decision
- <what we’ll do, short>

## Consequences
- <pro>
- <con>

## Tests
- <new/changed tests>

## Impacted files
- <paths>
```
  
### 4) `CONTRIBUTING.md`
<!-- file: CONTRIBUTING.md -->
```md
# Contributing

## Agent Rules (Copilot & other AI tools)
- **Architect first**: propose an ADR before non-trivial changes (`docs/adr/NNN-<slug>.md`).
- Prefer **smallest viable diffs** and localized edits.
- Maintain `TODO.md` (Now/Next/Later; ≤7 items) with acceptance criteria.
- After edits: run `task test` (or VS Code *Tasks: Run Task → test*) and paste failing output for triage.
- Use **Conventional Commits** in suggestions.
- Provide **one** verification command and the **expected outcome**.

## Improvement Scoring (0–5 each; Effort subtracts)
Weighting: Impact 40%, Risk-reduction 20%, Dev-Friction 15%, Confidence 10%, Effort −15%.  
**Score** = `0.4I + 0.2R + 0.15D + 0.1C − 0.15E`.

### Interpreting scores
- **P0 (≥3.5)**: Do now
- **P1 (3.0–3.49)**: Next
- **P2 (2.5–2.99)**: Later
- **P3 (<2.5)**: Backlog
```

### 5) `TODO.md`
<!-- file: TODO.md -->
```md
# TODO (Now / Next / Later)

> **Scoring**: Impact(0–5) · Risk-reduction(0–5) · Dev-Friction(0–5) · Confidence(0–5) · Effort(0–5)  
> **Score** = 0.4I + 0.2R + 0.15D + 0.1C − 0.15E. Keep list ≤7 items.

## Now
- [ ] (acceptance)

## Next
- [ ] (acceptance)

## Later
- [ ] (acceptance)

_This list is maintained by the AI agent per session._
```

### 6) `.github/ISSUE_TEMPLATE/ai-agent-improvements.md`
<!-- file: .github/ISSUE_TEMPLATE/ai-agent-improvements.md -->
```md
---
name: AI Agent: Improvements Sweep
about: Ask the AI agent to propose improvements to both the **AI code** and the **project** itself.
title: "AI Agent: Improvements Sweep"
labels: ["ai", "improvements"]
assignees: []
---

## Goal
Run a focused, time-boxed improvement pass across the repository.

## Scope
- Code quality and structure
- Test coverage and flakiness
- DX (scripts, Makefile/tasks, docs)
- Security & compliance (linting, SAST, dependencies)
- Performance hotspots (if any)
- Build/CI reliability
- Release hygiene

## Required Outputs
1. **Now / Next / Later** checklist (≤7 items) with acceptance criteria (update `TODO.md`). Include scores and order by score.
2. **ADR** for any non-trivial change (under `docs/adr/`).
3. **Minimal diffs** only; include exact commands to verify (`Tasks: Run Task → test`). 
4. **Conventional Commit** messages for each suggested change.
5. Update/append to `improvements.yaml` with scored items.

## Repo Signals
- Tests: `task test` (or `pytest -q` / `npm test -s` fallback)
- Linters: `task lint`
- Types: `task typecheck`
- Format: `task fmt`

## Notes for the Agent
- Prefer localized edits; avoid churn.
- If something is unclear, propose assumptions explicitly.
- If a change spans >80 lines, split into follow-up PRs.
```

### 7) `prompts/ai-improvements.md`
<!-- file: prompts/ai-improvements.md -->
```md
You are an **Engineering Improvement Agent** for this repository.

### Mission
Run a minimal-diff improvement sweep and **adapt to the current project** (detect language, test runner, linter, type checker).

### Detect & Adapt
- Infer primary stack (Python/Node/etc.) from files and config.
- Infer commands for tests/linters/types/format (e.g. pytest, npm test, ruff/eslint, pyright/tsc, black/prettier).
- If absent, bootstrap the **smallest** viable setup and stop after first green run.

### Guardrails
- Keep edits small and local. Avoid cascading refactors.
- Produce an ADR for any non-trivial change (`docs/adr/NNN-<slug>.md`).
- Update `TODO.md` with a Now/Next/Later plan (≤7 items).
- Score each item using the rubric in CONTRIBUTING.md and write entries to `improvements.yaml`.
- Always provide: exact commands to verify; Conventional Commit messages.

### Priorities
1) Tests first (stability, coverage of critical paths)
2) Lint/type/format baselines
3) Developer ergonomics (scripts/tasks/docs)
4) Security & supply-chain sanity (dependencies, SAST hints)
5) Performance only with evidence

### Required Output
1. Short status: what you examined and why (≤5 bullets).
2. Proposed ADR content (if needed).
3. Minimal patchset (only changed files; smallest viable diffs).
4. Commands to run (`task test`, `task lint`, etc.).
5. Commit message(s) in **Conventional Commits**.
6. A sorted table of `improvements.yaml` (highest score first) and suggested Now/Next/Later buckets.
```

### 8) `improvements.yaml`
<!-- file: improvements.yaml -->
```yaml
# improvements.yaml
# The AI agent appends items here. Scores use the rubric in CONTRIBUTING.md.
# Fields:
# - title: short description
# - impact: 0-5
# - risk_reduction: 0-5
# - dev_friction: 0-5   # how much developer pain it removes
# - confidence: 0-5     # confidence in the estimate
# - effort: 0-5         # higher = more work
# - acceptance: string  # acceptance criteria
# - notes: string       # optional context

items: []
```

### 9) `scripts/score-improvements.py`
<!-- file: scripts/score-improvements.py -->
```python
#!/usr/bin/env python3
import sys

WEIGHTS = dict(impact=0.4, risk_reduction=0.2, dev_friction=0.15, confidence=0.10, effort=-0.15)

def score_item(it):
    def g(k): 
        try:
            return float(it.get(k, 0) or 0.0)
        except Exception:
            return 0.0
    s = (WEIGHTS["impact"]*g("impact")
         + WEIGHTS["risk_reduction"]*g("risk_reduction")
         + WEIGHTS["dev_friction"]*g("dev_friction")
         + WEIGHTS["confidence"]*g("confidence")
         + WEIGHTS["effort"]*g("effort"))
    return round(s, 2)

def bucket(score):
    if score >= 3.5: return "P0/Now"
    if score >= 3.0: return "P1/Next"
    if score >= 2.5: return "P2/Later"
    return "P3/Backlog"

def load_yaml(path="improvements.yaml"):
    try:
        import yaml  # type: ignore
    except Exception:
        print("Missing dependency: pyyaml. Install with: pip install pyyaml", file=sys.stderr)
        sys.exit(2)
    with open(path, "r") as f:
        return yaml.safe_load(f) or {"items": []}

def main():
    data = load_yaml()
    items = data.get("items", [])
    for it in items:
        it["score"] = score_item(it)
        it["bucket"] = bucket(it["score"])
    items.sort(key=lambda x: x.get("score", 0), reverse=True)
    # Print table
    print("| Score | Bucket     | Title | I | R | D | C | E |")
    print("|------:|------------|-------|---:|---:|---:|---:|---:|")
    for it in items:
        print("| {score:>5} | {bucket:<10} | {title} | {impact} | {risk_reduction} | {dev_friction} | {confidence} | {effort} |".format(**{k:it.get(k,'') for k in ["score","bucket","title","impact","risk_reduction","dev_friction","confidence","effort"]}))
    # Suggested buckets
    counts = dict(now=0,next=0,later=0,backlog=0)
    for it in items:
        b = it["bucket"]
        if b.startswith("P0"): counts["now"] += 1
        elif b.startswith("P1"): counts["next"] += 1
        elif b.startswith("P2"): counts["later"] += 1
        else: counts["backlog"] += 1
    print("\nSuggested buckets:", counts)

if __name__ == "__main__":
    main()
```

### 10) `scripts/agent-kickstart.sh`
<!-- file: scripts/agent-kickstart.sh -->
```bash
#!/usr/bin/env bash
# Print the AI improvements prompt to start an adaptation-aware sweep.
set -euo pipefail
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

echo "=== AI Improvements Kickstart ==="
echo "Prompt file: $ROOT_DIR/prompts/ai-improvements.md"
echo
cat "$ROOT_DIR/prompts/ai-improvements.md"
echo
echo "Run scoring after agent writes items to improvements.yaml:"
echo "  python3 scripts/score-improvements.py"
```
