import { Simulation } from './Simulation';
import { SimulationRenderer2D } from './SimulationRenderer2D';

import tetoUrl from './teto/teto.jpg';


const config = {
    width: 1000,
    height: 1000,
};

async function main() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('webgpu')!

    canvas.width = config.width;
    canvas.height = config.height;

    const adapter = (await navigator.gpu.requestAdapter())!;
    const device = await adapter.requestDevice();
    
    ctx.configure({
        device,
        format: 'bgra8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });
    
    const simulation = new Simulation({
        width: config.width,
        height: config.height,
        dx: 0.05,
        dt: 0.00001,
        mass: 1,
        reducedPlanck:  1,
        automaticNormalize: false,
        device: device
    });

    const teto = new Image();
    teto.src = tetoUrl;
    await new Promise((resolve) => {
        teto.onload = () => {
            resolve(true);
        }
    });

    const renderer = new SimulationRenderer2D({ simulation, ctx, device, teto });

    // simulation.setPotentialByFunction((x, y) => {
    //     if(x >= 90 || x <= 10 || y >= 90 || y <= 10) {
    //         return 10;
    //     }
    //     return 0;
    //     // return (((x - 50) ** 2 + (y - 50) ** 2))/4000;
    // });
    // simulation.setPotentialByFunction((x, y) => {
    //     if(x >= 45 || x <= 5 || y >= 45 || y <= 5) {
    //         return 10000000;
    //     }
    //     // return 0;
    //     return (((x - 25) ** 2 + (y - 25) ** 2));
    // });

    simulation.setPotentialByFunction((x, y) => {
        if(x >= 48 || x <= 2 || y >= 48 || y <= 2) {
            return 10000000;
        }
        if(x >= 40 && x <= 40.1) {
            return 330;
        }
        return 0;
    });
    simulation.gaussianWavePacket(31, 30, 0.5, 100, 0);
    // simulation.normalize(await simulation.getNorm());
    
    async function frame() {
        for(let i = 0; i < 150; i++) {
            simulation.step();
            // simulation.smooth();
            // const norm = await simulation.getNorm();
            // simulation.normalize(norm);
        }
        const norm = await simulation.getNorm();
        console.log(norm);
        simulation.normalize(norm);
        renderer.render();

        requestAnimationFrame(frame);
    }

    frame();
    // console.log(await simulation.getNorm());
    // simulation.normalize(await simulation.getNorm());
}

main();