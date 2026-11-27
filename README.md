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

Static images live in `app/assets/`. The build uses relative paths, so the content of `dist/` can be published as is on the `gh-pages` branch.

Note: `three` and `tone` are pinned to their original 2016 versions (0.81 and 0.10). `three-js-csg`, used to carve the piano body, relies on `THREE.Geometry`, which was removed from recent Three.js versions.
