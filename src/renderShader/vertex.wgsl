
struct VertexOutput {
    @builtin(position) position : vec4f,
}

@vertex fn main(
    @builtin(vertex_index) vertexIndex : u32
) -> VertexOutput {
    let pos = array(
        vec2f(-1.0,  -1.0),
        vec2f(-1.0, 1.0),
        vec2f(1.0, -1.0),
        vec2f(1.0, 1.0),
        vec2f(-1.0, 1.0),
        vec2f(1.0, -1.0),
    );

    return VertexOutput(
        vec4f(pos[vertexIndex], 0.0, 1.0),
    );
}