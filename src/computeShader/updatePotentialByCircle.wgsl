override width = 512u;
override height = 512u;
override dx = 1.0;

@group(0) @binding(0) var<storage, read_write> data: array<f32>;
@group(0) @binding(1) var<storage, read> options: array<f32>;

fn idx(x: u32, y: u32) -> u32 {
    return y * width + x;
}

@compute @workgroup_size(8, 8) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
) {
    let x = global_id.x;
    let y = global_id.y;
    let circle_x = options[0];
    let circle_y = options[1];
    let radius = options[2];
    let value = options[3];

    if (x >= width || y >= height) {
        return;
    }

    if ((f32(x)*dx - circle_x) * (f32(x)*dx - circle_x) + (f32(y)*dx - circle_y) * (f32(y)*dx - circle_y)) < radius * radius {
        data[idx(x,y)] = value;
    }
}