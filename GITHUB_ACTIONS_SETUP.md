# GitHub Actions Version Management Setup

This repository includes automated version management using GitHub Actions.

## How it Works

### Automatic Version Bumping and Tagging

- **Trigger**: Push or merge to `main` branch
- **Condition**: Commit message does NOT contain `[no-cli]`
- **Actions performed in a single workflow run**:
  - Reads current version from `manifest.json`
  - Bumps minor version (e.g., 1.4 → 1.5)
  - Updates `manifest.json` with new version
  - Commits changes back to main with message: `New version v<Version> [no-cli]`
  - Creates a git tag `v<Version>` at that commit
  - Pushes both the commit and tag to the repository

## Repository Settings Required

To enable the workflow to push commits back to the main branch, you need to configure the following repository settings:

### 1. Workflow Permissions

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Under **Workflow permissions**, select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

### 2. Branch Protection (Optional but Recommended)

If you have branch protection rules on `main`, you may need to:

1. Go to **Settings** → **Branches**
2. Edit the branch protection rule for `main`
3. Under **Restrict pushes that create files**, allow pushes from GitHub Actions
4. Or add `github-actions[bot]` to the list of users who can push to protected branches

## Usage Examples

### Normal Development Flow

```bash
# Regular commits will trigger version bumping
git commit -m "Add new feature"
git push origin main
# → This will bump version and create a new commit with [no-cli]
```

### Bypassing Version Bumping

```bash
# Use [no-cli] to skip version bumping
git commit -m "Fix documentation [no-cli]"
git push origin main
# → This will NOT bump version or create tags
```

### Manual Version Bumping

```bash
# Manual version bumping is not recommended with this workflow
# Instead, let the workflow handle version bumping automatically
# If you need to skip version bumping for documentation or minor fixes:
git commit -m "Fix documentation [no-cli]"
git push origin main
# → This will NOT bump version or create tags
```

## Workflow Files

- `.github/workflows/version-management.yml` - Main workflow file

## Current Version

The current version is read from `manifest.json` and follows the format `major.minor` (e.g., "1.4").

## Troubleshooting

### Workflow Not Running

- Check that the repository has Actions enabled
- Verify that the workflow file is in the correct location
- Check the workflow permissions settings

### Permission Denied Errors

- Ensure "Read and write permissions" are enabled for workflows
- Check if branch protection rules are blocking the push

### Version Not Bumping

- Verify that the commit message doesn't contain `[no-cli]`
- Check the workflow run logs in the Actions tab
- Ensure the workflow has proper permissions to push to main branch

### Tags Not Being Created

- Check that the workflow completed successfully (both version bump and tag creation happen in the same job)
- Verify repository permissions allow tag creation
- Check the Actions tab for any error messages in the workflow run
