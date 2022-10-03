varying vec2 v_uv;

void main() {
    vec3 color1 = vec3(240.0, 217.0, 181.0) / 256.0;
    vec3 color2 = vec3(181.0, 136.0, 99.0) / 256.0;
    float n = (mod(floor(v_uv.x * 8.0) + floor(v_uv.y * 8.0), 2.0));
    gl_FragColor = vec4(color1 * n + color2 * (1.0 - n), 1.0);
}