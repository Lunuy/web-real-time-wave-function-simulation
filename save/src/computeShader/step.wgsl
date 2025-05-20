override width = 512u;
override height = 512u;
override dx = 1.0;
override dt = 0.1;
override reducedPlanck = 0.1; // reducedPlanck

@group(0) @binding(0) var<storage, read> from_f: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> to_f: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> potential: array<f32>;
@group(0) @binding(3) var<storage, read> options: array<f32>;

const i = mat2x2<f32>(0.0, 1.0, -1.0, 0.0);

fn idx(x: u32, y: u32) -> u32 {
    return y * width + x;
}

@compute @workgroup_size(8, 8) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
) {
    let x = global_id.x;
    let y = global_id.y;
    let m = options[0];
    let h = reducedPlanck;
    let invDx = 1.0 / dx;

    if (x == 0 || y == 0 || x >= width - 1 || y >= height - 1) {
        return;
    }
    
    // let laplacian = (0.5*(from_f[idx(x-1, y)] + from_f[idx(x+1, y)] + from_f[idx(x, y-1)] + from_f[idx(x, y+1)]) + 0.25*(from_f[idx(x-1, y+1)] + from_f[idx(x+1, y+1)] + from_f[idx(x+1,y-1)] + from_f[idx(x-1,y-1)]) - 3.0*from_f[idx(x,y)]) / (dx * dx);
    // let laplacian_1 = (0.5*(from_f[idx(x-1, y)] + from_f[idx(x+1, y)] + from_f[idx(x, y-1)] + from_f[idx(x, y+1)]) + 0.25*(from_f[idx(x-1, y+1)] + from_f[idx(x+1, y+1)] + from_f[idx(x+1,y-1)] + from_f[idx(x-1,y-1)]) - 3.0*from_f[idx(x,y)]);
    // let laplacian_f = select(laplacian_c / (length(laplacian_c)*40), laplacian_c, length(laplacian_c) < 2.0);
    
    // to_f[idx(x,y)] = from_f[idx(x,y)] + dt * (i * (h / (2.0 * m) * laplacian - (1 / h) * potential[idx(x,y)] * from_f[idx(x,y)]));

    let v = potential[idx(x,y)];
    // sample from past
    // let laplacian_1 = (4.0*(from_f[idx(x-1, y)] + from_f[idx(x+1, y)] + from_f[idx(x, y-1)] + from_f[idx(x, y+1)]) + from_f[idx(x-1, y+1)] + from_f[idx(x+1, y+1)] + from_f[idx(x+1,y-1)] + from_f[idx(x-1,y-1)] - 20.0*from_f[idx(x,y)]);
    // let laplacian_2 = laplacian_1 * (((invDx * dt) * invDx) * h / (6.0 * m));
    // let laplacian_3 = select(vec2<f32>(0.0, 0.0), laplacian_2, x >= 1 && y >= 1 && x < width - 2 && y < height - 2);
    // let laplacian_4 = select(vec2<f32>(0.0, 0.0), laplacian_3, length(laplacian_3) < 2.0);
    // to_f[idx(x,y)] = from_f[idx(x,y)] + i * laplacian_4 - dt * (i * ((1 / h) * potential[idx(x,y)] * from_f[idx(x,y)]));

    // sample from future
    let laplacian = (4.0*(from_f[idx(x-1, y)] + from_f[idx(x+1, y)] + from_f[idx(x, y-1)] + from_f[idx(x, y+1)]) + from_f[idx(x-1, y+1)] + from_f[idx(x+1, y+1)] + from_f[idx(x+1,y-1)] + from_f[idx(x-1,y-1)] - 20.0*from_f[idx(x,y)]) / (6 * dx * dx);
    // let laplacian = vec2<f32>(min(100.0, laplacian_.x), min(100.0, laplacian_.y));
    to_f[idx(x,y)] = (
        from_f[idx(x,y)]
        + dt*dt/(2.0*m)*laplacian*v
        + i * (dt*h/(2.0*m)*laplacian)
        - i * (dt/h*v*from_f[idx(x,y)])
    ) / (1.0 + (dt*v/h)*(dt*v/h));

    // if(length(to_f[idx(x,y)]) < 0.0001 && length(laplacian) > 0.000000001) {
    //     to_f[idx(x,y)] = vec2<f32>(0.0, 0.0);
    // }

    // to_f[idx(x,y)] = (
    //     from_f[idx(x,y)]
    //     + dt*dt/(2.0*m)*laplacian*v
    //     + i * (dt*h/(2.0*m)*laplacian)
    //     - i * (dt/h*v*from_f[idx(x,y)])
    // ) / (1.0 + (dt*v/h)*(dt*v/h));
}