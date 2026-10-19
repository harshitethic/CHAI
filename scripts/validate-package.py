#!/usr/bin/env python3
"""Validate that the CHAI handoff archive source includes expected documents/assets.
This validates the SPEC BUNDLE, not a functioning CHAI implementation.
"""
from pathlib import Path
import hashlib
import sys

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = [
    'README.md', 'prompt.md', 'brain.md', 'tasks.md', 'checks.md',
    'decisions.md', 'handoff.md', 'blockers.md',
    'docs/PRODUCT.md', 'docs/ARCHITECTURE.md', 'docs/STATE_PROTOCOL.md',
    'docs/DESIGN_SYSTEM.md', 'docs/SECURITY.md', 'docs/PROVIDERS.md',
    'docs/TEST_PLAN.md', 'docs/KALI_RUNBOOK.md', 'docs/GITHUB_RUNBOOK.md',
    'docs/ACCEPTANCE.md', 'docs/REFERENCE_IMAGES.md',
    'templates/.env.example', 'templates/SECURITY.md',
    'templates/CONTRIBUTING.md', 'templates/CI_STARTER.yml',
    'templates/gitignore.example', 'templates/ISSUE_TEMPLATE.md',
    'templates/PR_TEMPLATE.md',
    'refs/01-initial-dark-panel.png', 'refs/02-claude-app-overview.png',
    'refs/03-model-selector.png', 'refs/04-thinking-effort.png',
    'refs/05-claude-dark-app.png', 'refs/06-claude-dark-style-guide.png',
]

failures = []
for rel in REQUIRED:
    p = ROOT / rel
    if not p.is_file() or p.stat().st_size <= 0:
        failures.append(f'Missing/empty: {rel}')
    elif p.suffix == '.png' and p.open('rb').read(8) != b'\x89PNG\r\n\x1a\n':
        failures.append(f'Not a PNG: {rel}')

md_docs = sorted(p for p in ROOT.rglob('*.md') if p.is_file())
print('CHAI prompt bundle validation (not source-code verification)')
print(f'Files required: {len(REQUIRED)}; Markdown docs: {len(md_docs)}')
print(f'Words in PROMPT: {len((ROOT / "prompt.md").read_text().split())}')
for p in sorted((ROOT / 'refs').glob('*.png')):
    digest = hashlib.sha256(p.read_bytes()).hexdigest()
    print(f'  {p.name}: {p.stat().st_size} bytes, sha256={digest}')
for item in failures:
    print('FAIL:', item, file=sys.stderr)
if failures:
    sys.exit(1)
print('PASS: required package files and PNG headers present')
