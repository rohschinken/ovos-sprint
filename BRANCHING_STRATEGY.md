# Git Branching Strategy

## Overview

This project uses a simple two-branch workflow optimized for solo development:

- **`main`** - Production-ready code (deployed to PROD server)
- **`next`** - Active development branch (local testing)
- **`feature/*`** - Optional branches for complex features
- **`fix/*`** - Optional branches for complex bug fixes

## Branch Structure

```
main (production) ──────────────────────── https://sprint.ovos.at
  ↑
  └── next (development) ──────────────── Local testing
        ↑
        ├── feature/feature-name (optional) ── Complex features
        └── fix/bug-description (optional) ──── Complex bug fixes
```

## Branch Descriptions

### `main` Branch
- **Purpose**: Production-ready, stable code
- **Deployed to**: PROD server (https://sprint.ovos.at)
- **Update frequency**: Only when `next` is stable and tested
- **Releases**: Tagged with semantic versioning (v1.0.0, v1.1.0, etc.)
- **Protection**: Minimal (restrict deletion only)

### `next` Branch
- **Purpose**: Active development and integration
- **Deployed to**: Local development environment
- **Update frequency**: Daily commits for most work
- **Testing**: All changes must be tested locally before merging to `main`
- **Default branch**: Use this for day-to-day development

### `feature/*` Branches (Optional)
- **Purpose**: Isolate complex features that span multiple days
- **When to use**: Only for complex work that needs isolation
- **Example**: `feature/complete-ui-redesign`, `feature/new-auth-system`
- **Lifetime**: Delete immediately after merging to `next`

### `fix/*` Branches (Optional)
- **Purpose**: Isolate complex bug fixes
- **When to use**: Only for bugs that require significant investigation
- **Example**: `fix/database-migration-issue`, `fix/memory-leak`
- **Lifetime**: Delete immediately after merging to `next`

## Workflows

### Daily Development (Most Common)

Work directly on `next` for simple changes:

```bash
# Switch to next and pull latest
git checkout next
git pull origin next

# Make your changes
# ... edit files ...

# Commit and push
git add .
git commit -m "feat: add new dashboard widget

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin next
```

### Complex Feature Development

Use a feature branch when work spans multiple days:

```bash
# Create feature branch from next
git checkout next
git pull origin next
git checkout -b feature/complex-redesign

# Work over multiple days
git add .
git commit -m "feat: part 1 of redesign"
git push -u origin feature/complex-redesign

# ... continue working ...
git commit -m "feat: complete redesign implementation"
git push

# When done, merge back to next
git checkout next
git pull origin next
git merge feature/complex-redesign
git push origin next

# Cleanup
git branch -d feature/complex-redesign
git push origin --delete feature/complex-redesign
```

### Bug Fix Development

Similar to features, only use a branch for complex fixes:

```bash
# Create fix branch from next
git checkout next
git pull origin next
git checkout -b fix/database-performance

# Fix the issue
git add .
git commit -m "fix: optimize database queries for timeline"
git push -u origin fix/database-performance

# Merge back to next
git checkout next
git merge fix/database-performance
git push origin next

# Cleanup
git branch -d fix/database-performance
git push origin --delete fix/database-performance
```

### Releasing to Production

When `next` is stable and ready for production:

```bash
# 1. Ensure next is fully tested locally
git checkout next
git pull origin next
# TEST THOROUGHLY: Run the app, test all features, check for errors

# 2. Merge to main
git checkout main
git pull origin main
git merge next

# 3. Push to GitHub
git push origin main

# 4. Tag the release
git tag -a v1.2.0 -m "Release v1.2.0

Features:
- Add assignment groups
- Improve timeline performance

Fixes:
- Fix CORS configuration
- Fix database schema issues

Chore:
- Update production documentation"
git push origin v1.2.0

# 5. Deploy to production server
# SSH to server:
#   cd /path/to/ovos-sprint
#   git checkout main
#   git pull origin main
#   cd backend && npm run build
#   pm2 restart ovos-sprint

# 6. Return to development
git checkout next
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]

[optional footer: Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>]
```

### Types

- **feat:** New feature or functionality
- **fix:** Bug fix
- **chore:** Maintenance, dependencies, refactoring
- **docs:** Documentation changes only
- **style:** Code formatting (no logic change)
- **refactor:** Code restructuring (no functional change)
- **test:** Adding or updating tests
- **perf:** Performance improvements

### Examples

```bash
# Simple feature
git commit -m "feat: add export to CSV button"

# Bug fix with body
git commit -m "fix: correct timezone handling in date picker

The date picker was using UTC instead of local timezone,
causing dates to shift by one day for some users."

# Documentation update
git commit -m "docs: update API endpoint documentation in ARCHITECTURE.md"

# Maintenance
git commit -m "chore: update dependencies and fix security vulnerabilities"
```

## Decision Guide

### When to use `next` directly?
- Simple feature additions (< 1 day of work)
- Small bug fixes
- Documentation updates
- Dependency updates
- Most day-to-day work

### When to use a `feature/*` branch?
- Complex features spanning multiple days
- Major refactoring that might break things
- Experimental work you're not sure about
- Work that might get interrupted

### When to use a `fix/*` branch?
- Complex bugs requiring investigation
- Fixes that might introduce new issues
- Changes affecting multiple systems

## Common Commands

### Check current branch
```bash
git branch
git status
```

### Switch branches
```bash
git checkout next      # Switch to next
git checkout main      # Switch to main
```

### Update local branch
```bash
git pull origin next   # Pull latest next
git pull origin main   # Pull latest main
```

### View commit history
```bash
git log --oneline -10           # Last 10 commits
git log --graph --oneline --all # Visual branch history
```

### Undo last commit (keep changes)
```bash
git reset --soft HEAD~1
```

### Discard local changes
```bash
git restore <file>     # Discard changes to specific file
git restore .          # Discard all changes
```

## Troubleshooting

### I committed to the wrong branch!

If you committed to `main` instead of `next`:

```bash
# Save the commit hash
git log -1

# Switch to next
git checkout next

# Cherry-pick the commit
git cherry-pick <commit-hash>

# Push to next
git push origin next

# Go back to main and undo the commit
git checkout main
git reset --hard origin/main
```

### I need to move uncommitted changes to a different branch

```bash
# Save your changes
git stash

# Switch to correct branch
git checkout next

# Apply the changes
git stash pop
```

### My branch is behind main/next

```bash
# Update your branch
git checkout next
git pull origin next

# If on a feature branch
git checkout feature/my-feature
git merge next
```

### I want to see what changed

```bash
# Changes since last commit
git diff

# Changes between branches
git diff main...next

# Files changed in last commit
git show --stat

# Full diff of last commit
git show
```

## Best Practices

1. **Pull before you push**: Always `git pull origin next` before pushing
2. **Commit often**: Small, focused commits are better than large ones
3. **Test before merging**: Always test `next` locally before merging to `main`
4. **Clean commit messages**: Use conventional commit format
5. **Delete merged branches**: Keep the branch list clean
6. **Tag releases**: Always tag when merging to `main`
7. **Stay on next**: Do most work directly on `next` branch

## Release Checklist

Before merging `next` to `main`:

- [ ] All features tested locally
- [ ] No console errors in browser
- [ ] Backend starts without errors
- [ ] Database migrations work correctly
- [ ] Production environment variables are up to date
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG updated (optional)
- [ ] Commit all changes and push to `next`

After merging to `main`:

- [ ] Tag the release with semantic version
- [ ] Deploy to production server
- [ ] Test production deployment
- [ ] Monitor PM2 logs for errors
- [ ] Return to `next` branch for continued development

## GitHub Repository

**Remote**: https://github.com/rohschinken/ovos-sprint.git

View branches: https://github.com/rohschinken/ovos-sprint/branches

View tags: https://github.com/rohschinken/ovos-sprint/tags

## Questions?

For more information about git workflows:
- [Git Book](https://git-scm.com/book/en/v2)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
