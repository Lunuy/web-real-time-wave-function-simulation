

override width = 512u;
override height = 512u;

@group(0) @binding(0) var<storage, read> from_f: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> to_f: array<vec2<f32>>;

fn idx(x: u32, y: u32) -> u32 {
    return y * width + x;
}

@compute @workgroup_size(8, 8) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
) {
    let x = global_id.x;
    let y = global_id.y;

    if (x == 0 || y == 0 || x >= width - 1 || y >= height - 1) {
        return;
    }

    to_f[idx(x,y)] = (from_f[idx(x,y)] + from_f[idx(x-1,y)] + from_f[idx(x+1,y)] + from_f[idx(x,y-1)] + from_f[idx(x,y+1)]) / 5.0;
}