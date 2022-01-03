uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

uniform float uRatio;

attribute vec3 position;
attribute vec3 normal;
attribute float aRandom;

varying vec3 vNormal;
varying float vRandom;
varying float vRatio;

void main() {
    vec4 modelPositon = modelMatrix * vec4(position, 1.0);
    modelPositon.xyz += normal * sin(normal.x * uRatio) * 0.5;
    vec4 viewPosition = viewMatrix * modelPositon;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    vRandom = aRandom;
    vNormal = normal;
    vRatio = uRatio;
}