varying vec2 v_uv;

void main() {
    vec4 modelPositon = modelMatrix * vec4(position, 1.0);
    modelPositon.xz += 0.5;
    vec4 viewPosition = viewMatrix * modelPositon;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    v_uv = uv;
}