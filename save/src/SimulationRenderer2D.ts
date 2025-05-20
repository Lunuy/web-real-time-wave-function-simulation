
import vertexShaderCode from "./renderShader/vertex.wgsl?raw";
import fragmentShaderCode from "./renderShader/fragment.wgsl?raw";


import { Simulation } from "./Simulation";


export interface SimulationRenderer2DOptions {
    simulation: Simulation;
    device: GPUDevice;
    ctx: GPUCanvasContext;
}

export class SimulationRenderer2D {
    private waveFunctionBuffer: GPUBuffer;

    private renderPipeline: GPURenderPipeline;

    private simulation: Simulation;
    private ctx: GPUCanvasContext;
    private device: GPUDevice;
    constructor(options: SimulationRenderer2DOptions) {
        this.simulation = options.simulation;
        this.ctx = options.ctx;
        this.device = options.device;

        this.waveFunctionBuffer = this.simulation.getWaveFunctionBuffer();

        this.renderPipeline = this.device.createRenderPipeline({
            vertex: {
                module: this.device.createShaderModule({
                    code: vertexShaderCode,
                }),
                entryPoint: 'main',
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: fragmentShaderCode,
                }),
                entryPoint: 'main',
                targets: [
                    {
                        format: navigator.gpu.getPreferredCanvasFormat(),
                    },
                ],
                constants: {
                    width: this.simulation.options.width,
                    height: this.simulation.options.height,
                },
            },
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [
                    this.device.createBindGroupLayout({
                        entries: [
                            {
                                binding: 0,
                                visibility: GPUShaderStage.FRAGMENT,
                                buffer: {
                                    type: 'read-only-storage',
                                },
                            },
                        ],
                    }),
                ],
            }),
        });

    }
    public render() {
        const texture = this.ctx.getCurrentTexture();
        const view = texture.createView();

        const commandEncoder = this.device.createCommandEncoder();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: view,
                    clearValue: [0, 0, 0, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        };

        const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(this.renderPipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.waveFunctionBuffer,
                    },
                },
            ],
        }));
        pass.draw(6);
        pass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}