precision mediump float;

varying vec3 vNormal;
varying float vRandom;
varying float vRatio;

const float brightness = 0.6;

void main() {
    gl_FragColor = vec4(vNormal * (1.0 - brightness) + vec3(brightness), 1.0);
}
