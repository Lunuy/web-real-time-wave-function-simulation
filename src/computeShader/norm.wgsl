
override width = 512u;
override height = 512u;
override dx = 1.0;

fn idx(x: u32, y: u32) -> u32 {
    return y * width + x;
}

@group(0) @binding(0) var<storage, read> data: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> chunk: array<f32>;

@compute @workgroup_size(8, 8) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
    let x = global_id.x;
    let y = global_id.y;

    if (x >= width || y >= height) {
        return;
    }

    let vvdxdy = length(data[idx(x,y)]) * length(data[idx(x,y)]) * dx * dx;
    chunk[idx(x,y)] = vvdxdy;
}