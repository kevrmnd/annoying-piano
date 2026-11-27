import * as THREE from 'three';

// Fog anchored in the world instead of following the camera: the material
// fades to `color` with the distance from the scene's center (x / z plane),
// between `near` and `far`. Zooming in or out doesn't change it.
export default function addWorldFog(material, { color, near, far }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.worldFogColor = { value: new THREE.Color(color) };
    shader.uniforms.worldFogNear = { value: near };
    shader.uniforms.worldFogFar = { value: far };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldFogPosition;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWorldFogPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWorldFogPosition;
uniform vec3 worldFogColor;
uniform float worldFogNear;
uniform float worldFogFar;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
float worldFog = smoothstep(worldFogNear, worldFogFar, length(vWorldFogPosition.xz));
gl_FragColor.rgb = mix(gl_FragColor.rgb, worldFogColor, worldFog);`,
      );
  };
  material.needsUpdate = true;
}
