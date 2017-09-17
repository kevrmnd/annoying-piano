import Webgl from './js/core/Webgl';
import loop from './js/core/Loop';
import props from './js/core/props';
import Piano from './js/components/Piano';
import Box from './js/components/Box';


// ##
// INIT
const webgl = new Webgl(window.innerWidth, window.innerHeight);
document.body.appendChild(webgl.dom);
// - Add object update to loop
loop.add(webgl.onUpdate);

// ##
// EXAMPLE LIGHT
const light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set(0, 2, 1);
light.castShadow = true;
webgl.add(light);

const ambient_light = new THREE.AmbientLight(0xffffff, 0.5);
webgl.add(ambient_light);

// ##
// GROUND
const ground = new Box(0xdddddd, 60, 0.1, 60);
webgl.add(ground);

// ##
// PIANO
const piano = new Piano();
webgl.add(piano);

// ##
// RENDERER
loop.start();


// ##
// ON RESIZE / ORIENTATION CHANGE
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  webgl.onResize(w, h);
}

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
