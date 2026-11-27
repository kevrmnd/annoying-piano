# Annoying piano

A simple piano (synth) with an annoying sound. Made with [Three.js](http://threejs.org/) and [Tone.js](https://tonejs.github.io/).

## Demo

Check the [demo](https://kevrmnd.github.io/annoying-piano/).

## Development

Built with [Vite](https://vite.dev/). Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev      # dev server with hot reload
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

Static images live in `app/assets/`.

## Deployment

Each push to `master` builds the project and publishes `dist/` to the `gh-pages` branch (see `.github/workflows/deploy.yml`). It can also be run by hand from the Actions tab.
