

@group(0) @binding(0) var<storage, read_write> chunk: array<f32>;
@group(0) @binding(1) var<storage> options: array<u32>;

@compute @workgroup_size(64, 1) fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
    let stride = options[0];
    let works = options[1];

    let x = global_id.x;
    let y = global_id.y;

    let i = global_id.x*64 + global_id.y;

    if (i >= works) {
        return;
    }

    // let i = workgroup_id.x;

    chunk[i*stride*2] = chunk[i*stride*2] + chunk[i*stride*2 + stride];
}