---
name: cleanup
description: Safely clean up temporary files, build artifacts, test outputs, and OS junk in Körset.
---

# Cleanup Skill

Clean up workspace junk files, temporary test artifacts, and build cache without affecting source code or committed assets.

## When to Run

- After intensive testing or build sessions
- Before creating release commits
- When workspace has leftover `dist`, `test-results`, or OS junk files
- Triggered by user via `/cleanup` or autonomously when cleaning repo

## PowerShell Commands

```powershell
# 1. Clear build artifacts
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue

# 2. Clear OS metadata
Get-ChildItem -Recurse -Force -Include "Thumbs.db",".DS_Store","desktop.ini" -ErrorAction SilentlyContinue | Remove-Item -Force

# 3. Clear temporary test results
Remove-Item -Recurse -Force "test-results" -ErrorAction SilentlyContinue

# 4. Clean empty directories in src
Get-ChildItem -Path "src" -Recurse -Directory -ErrorAction SilentlyContinue | Where-Object { (Get-ChildItem $_.FullName -Force).Count -eq 0 } | Remove-Item -Force
```
