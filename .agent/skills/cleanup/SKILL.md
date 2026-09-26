---
name: cleanup
description: Inspect disposable Körset build/test artifacts and remove only explicitly authorized targets.
---

# Workspace cleanup

Start with git status. Untracked source, root-level probes, session extracts and data
may contain unfinished work; do not delete them based on their filenames.
New temporary work belongs in ignored scratch/.

For an authorized cleanup, list the exact generated targets (for example dist/ or
test-results/), resolve their absolute paths, and verify they remain inside this
workspace. Use PowerShell Remove-Item -LiteralPath only on those checked targets.
Do not recursively scan or remove OS metadata across the whole repository, traverse
junctions, remove empty source directories, or run git clean as routine housekeeping.
Keep output, notes and backups needed for unfinished work.
