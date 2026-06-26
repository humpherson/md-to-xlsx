# md-to-xlsx

Static client-side web app for converting the repository's specific markdown story format into a styled Excel workbook.

## GitHub Pages

This repo is configured to publish from the `docs/` folder on the `main` branch.

Deploy flow:

```bash
npm run build
git add docs
git commit -m "Update Pages build"
git push
```

In GitHub Pages settings, set:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/docs`

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The app runs entirely in the browser. Uploaded files are read locally and are not sent to a server.
