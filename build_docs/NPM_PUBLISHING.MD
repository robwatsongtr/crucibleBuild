# Publishing to npm

## One-time setup

1. Create a free account at npmjs.com
2. Run `npm login` in your terminal and enter your credentials

That's it. Your machine is now authorized to publish.

---

## Before publishing

### 1. Check package.json has the right fields

```json
{
  "name": "cruciblebuild",
  "version": "1.0.0",
  "bin": {
    "cruciblebuild": "dist/cli/index.js"
  },
  "files": [
    "dist",
    "luthor_curriculum",
    "python_luthor",
    "cpp_luthor",
    "constraint_profile_example.md"
  ]
}
```

- `name` — what users install: `npm install -g cruciblebuild`
- `version` — bump this before every publish (see versioning below)
- `bin` — registers the `cruciblebuild` command in the user's PATH
- `files` — what gets uploaded; everything else is excluded

### 2. Build first

```bash
npm run build
```

npm ships whatever is in `dist/` — always build before publishing.

### 3. Preview what will be uploaded

```bash
npm pack --dry-run
```

Lists every file that would be included. Good sanity check before going live.

---

## Publishing

```bash
npm publish
```

Done. The package is live on npmjs.com immediately. Users can install it with:

```bash
npm install -g cruciblebuild
```

---

## Versioning

npm enforces semver — you cannot publish the same version twice. Bump the version in `package.json` before every publish:

| Change | Version bump | Example |
|---|---|---|
| Bug fix | patch | `1.0.0` → `1.0.1` |
| New feature, backwards compatible | minor | `1.0.0` → `1.1.0` |
| Breaking change | major | `1.0.0` → `2.0.0` |

Or use npm's shorthand:

```bash
npm version patch   # bumps 1.0.0 → 1.0.1
npm version minor   # bumps 1.0.0 → 1.1.0
npm version major   # bumps 1.0.0 → 2.0.0
```

Then publish:

```bash
npm run build
npm publish
```

---

## Updating an existing install

Users update to the latest version with:

```bash
npm install -g cruciblebuild@latest
```

---

## Useful commands

```bash
npm whoami                  # confirm you're logged in
npm pack --dry-run          # preview what would be uploaded
npm info cruciblebuild      # check what's currently live on npm
npm unpublish cruciblebuild@1.0.0  # remove a specific version (within 72 hours of publish)
```
