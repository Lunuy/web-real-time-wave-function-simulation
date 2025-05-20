override width = 512u;
override height = 512u;
override dx = 1.0;

@group(0) @binding(0) var<storage, read_write> data: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> options: array<f32>;

const PI = 3.141592;
const i = mat2x2<f32>(0.0, 1.0, -1.0, 0.0);

fn idx(x: u32, y: u32) -> u32 {
    return y * width + x;
}

@compute @workgroup_size(8, 8) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
) {
    let x = global_id.x;
    let y = global_id.y;
    let packet_x = options[0];
    let packet_y = options[1];
    let sigma = options[2];
    let kx = options[3];
    let ky = options[4];

    if (x >= width || y >= height) {
        return;
    }

    let xdx = f32(x) * dx;
    let ydx = f32(y) * dx;

    // data[idx(x,y)] = vec2<f32>(3.0, 3.0);
    let theta_ = (kx * (xdx - packet_x) + ky * (ydx - packet_y)) / (2.0 * PI);
    let theta = select(theta_, theta_ - 2.0 * PI, theta_ > PI);
    data[idx(x,y)] = pow(1.0/(2.0*PI*sigma*sigma), 0.25)*exp(-((xdx - packet_x) * (xdx - packet_x) + (ydx - packet_y) * (ydx - packet_y)) / (4.0 * sigma * sigma)) * vec2<f32>(cos(theta), sin(theta));
}