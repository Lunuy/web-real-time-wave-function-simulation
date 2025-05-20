override width = 512u;
override height = 512u;

struct VertexOutput {
    @builtin(position) position : vec4f,
}

@group(0) @binding(0) var<storage, read> wave: array<vec2<f32>>;
@group(0) @binding(1) var tetoTexture: texture_2d<f32>;


const PI: f32 = 3.141592;

// fn hslToRgb(h: f32, s: f32, l: f32) -> vec3<f32> {
//     let c = (1.0 - abs(2.0 * l - 1.0)) * s;
//     let x = c * (1.0 - abs((h * 6.0 % 2.0) - 1.0));
//     let m = l - c / 2.0;
//     var rgb: vec3<f32>;
//     if (h < 1.0 / 6.0) {
//         rgb = vec3<f32>(c, x, 0.0);
//     } else if (h < 2.0 / 6.0) {
//         rgb = vec3<f32>(x, c, 0.0);
//     } else if (h < 3.0 / 6.0) {
//         rgb = vec3<f32>(0.0, c, x);
//     } else if (h < 4.0 / 6.0) {
//         rgb = vec3<f32>(0.0, x, c);
//     } else if (h < 5.0 / 6.0) {
//         rgb = vec3<f32>(x, 0.0, c);
//     } else {
//         rgb = vec3<f32>(c, 0.0, x);
//     }
//     return rgb + m;
// }

fn f(l: f32, s: f32) -> f32 {
    if (l < 0.5) { return l * (1 + s); } else { return l + s - l * s; };
}

fn hslToRgb(h: f32, s: f32, l: f32) -> vec3<f32> {
  if (s == 0) {
    return vec3<f32>(l, l, l); // achromatic
  } else {
    let q = f(l, s);
    let p = 2 * l - q;
    let r = hueToRgb(p, q, h + 1.0/3.0);
    let g = hueToRgb(p, q, h);
    let b = hueToRgb(p, q, h - 1.0/3.0);
    return vec3<f32>(r, g, b);
  }
}

fn hueToRgb(p: f32, q: f32, t_: f32) -> f32 {
    let t = select(select(t_, t_-1, t_ > 1), t_+1, t_ < 0);
  if (t < 1.0/6.0) { return p + (q - p) * 6 * t; }
  if (t < 1.0/2.0) { return q; }
  if (t < 2.0/3.0) { return p + (q - p) * (2.0/3.0 - t) * 6; }
  return p;
}

fn complexToHSL(c: vec2<f32>) -> vec3<f32> {
    let h = (atan2(c.y, c.x) + 2*PI / 3) / (2*PI);
    let s = 1.0;
    let l = length(c);
    return vec3<f32>(h, s, l);
}

fn complexToRGB(c: vec2<f32>) -> vec3<f32> {
    let hsl = complexToHSL(c);
    let r = hslToRgb(hsl.x, hsl.y, hsl.z);
    return r;
}

fn complexToRGBL(c: vec2<f32>, l: f32) -> vec3<f32> {
    let hsl = complexToHSL(c);
    let r = hslToRgb(hsl.x, hsl.y, l);
    return r;
}

@fragment fn main(
    vo: VertexOutput
) -> @location(0) vec4f {
    let pos = vo.position;
    let x = u32(pos.x);
    let y = height - u32(pos.y) - 1;
    let i = y * width + x;
    let v = wave[i];

    let rgb = complexToRGB(v);

    if(x >= 800 && x <= 802) {
      return textureLoad(tetoTexture, vec2<i32>(210, i32(y-220)), 0);
    }
    return vec4f(rgb*5, 1.0);
    // let rgb = complexToRGBL(v, 0.6);
    // return vec4f(rgb, 1.0);
    // let l = length(v);
    // return vec4f(l, l, l, 1.0);
}