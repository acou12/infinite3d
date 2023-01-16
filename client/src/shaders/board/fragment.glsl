varying vec2 v_uv;

void main() {
    vec3 color1 = vec3(240.0, 217.0, 181.0) / 256.0;
    vec3 color2 = vec3(181.0, 136.0, 99.0) / 256.0;
    float dist = sqrt((v_uv.x - 0.5) * (v_uv.x - 0.5) + (v_uv.y - 0.5) * (v_uv.y - 0.5));
    float angle = atan(v_uv.y - 0.5, v_uv.x - 0.5);
    float a = 0.002;
    float newDist = pow(a, 2.0) / (a - dist) - a;
    vec2 new = vec2(
        newDist * cos(angle),
        newDist * sin(angle)
    );
    float n = (mod(floor(new.x * 5000.0) + floor(new.y * 5000.0), 2.0));
    gl_FragColor = dist > a ? vec4(0.0) : vec4(color1 * n + color2 * (1.0 - n), 1.0);
}