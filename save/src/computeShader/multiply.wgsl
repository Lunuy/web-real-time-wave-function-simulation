override width = 512u;
override height = 512u;

@group(0) @binding(0) var<storage, read_write> data: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> options: array<f32>;

fn idx(x: u32, y: u32) -> u32 {
    return y * width + x;
}

@compute @workgroup_size(8, 8) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
) {
    let x = global_id.x;
    let y = global_id.y;
    let factor = options[0];

    if (x >= width || y >= height) {
        return;
    }

    data[idx(x,y)] = data[idx(x,y)] * factor;
}