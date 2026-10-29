import * as THREE from 'three';

export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(600, 800) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;

    vec2 curve(vec2 uv) {
      uv = uv * 2.0 - 1.0;
      vec2 offset = abs(uv.yx) / vec2(6.0, 5.0);
      uv = uv + uv * offset * offset;
      return uv * 0.5 + 0.5;
    }

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = curve(vUv);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      vec3 col = texture2D(tDiffuse, uv).rgb;
      col += texture2D(tDiffuse, uv - vec2(0.003, 0.0)).rgb * 0.18;

      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      vec3 phosphor = vec3(0.3, 1.0, 0.45) * lum * 1.35 + vec3(0.0, 0.03, 0.012);

      float scan = 0.72 + 0.28 * sin(uv.y * resolution.y * 3.14159);
      phosphor *= scan;
      phosphor *= 0.92 + 0.08 * sin(uv.x * resolution.x * 2.0);

      float vig = 16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
      phosphor *= pow(vig, 0.3);

      phosphor *= 0.97 + 0.03 * sin(time * 110.0);
      phosphor *= 1.0 + 0.05 * sin((uv.y - time * 0.12) * 6.2831);
      phosphor += (rand(uv * (time + 1.0)) - 0.5) * 0.035;

      gl_FragColor = vec4(phosphor, 1.0);
    }
  `,
};
