import { Simulation } from './Simulation';
import { SimulationRenderer2D } from './SimulationRenderer2D';



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
    const renderer = new SimulationRenderer2D({ simulation, ctx, device });

    // simulation.setPotentialByFunction((x, y) => {
    //     if(x >= 90 || x <= 10 || y >= 90 || y <= 10) {
    //         return 10;
    //     }
    //     return 0;
    //     // return (((x - 50) ** 2 + (y - 50) ** 2))/4000;
    // });
    simulation.setPotentialByFunction((x, y) => {
        if(x >= 45 || x <= 5 || y >= 45 || y <= 5) {
            return 10000000;
        }
        // return 0;
        return (((x - 25) ** 2 + (y - 25) ** 2));
    });
    simulation.gaussianWavePacket(30, 30, 0.5, 0, 0);
    // simulation.normalize(await simulation.getNorm());
    
    async function frame() {
        for(let i = 0; i < 100; i++) {
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