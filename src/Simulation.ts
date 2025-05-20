

import stepShaderCode from './computeShader/step.wgsl?raw';
import updatePotentialByCircleShaderCode from './computeShader/updatePotentialByCircle.wgsl?raw';
import gaussianWavePacketShaderCode from './computeShader/gaussianWavePacket.wgsl?raw';
import multiplyShaderCode from './computeShader/multiply.wgsl?raw';
import normShaderCode from './computeShader/norm.wgsl?raw';
import reduceAddShaderCode from './computeShader/reduceAdd.wgsl?raw';
import smoothShaderCode from './computeShader/smooth.wgsl?raw';

interface SimulationOptions {
    width: number;
    height: number;
    dx: number;
    dt: number;
    mass: number;
    reducedPlanck: number;
    automaticNormalize: boolean;
    device: GPUDevice;
}

export class Simulation {
    private device: GPUDevice;

    private potentialBuffer: GPUBuffer;
    private waveFunctionBuffer1: GPUBuffer;
    private waveFunctionBuffer2: GPUBuffer;
    private stepBuffer: GPUBuffer;
    private updatePotentialByCircleBuffer: GPUBuffer;
    private gaussianWavePacketBuffer: GPUBuffer;
    private multiplyBuffer: GPUBuffer;
    private normBuffer: GPUBuffer;
    private normReadBuffer: GPUBuffer;
    private reduceAddBuffer: GPUBuffer;

    private stepPipeline: GPUComputePipeline;
    private updatePotentialByCirclePipeline: GPUComputePipeline;
    private updatePotentialByCircleBindGroup: GPUBindGroup;
    private gaussianWavePacketPipeline: GPUComputePipeline;
    private normPipeline: GPUComputePipeline;
    private reduceAddPipeline: GPUComputePipeline;
    private multiplyPipeline: GPUComputePipeline;
    private smoothPipeline: GPUComputePipeline;

    private switch: boolean; // false: 1 -> 2, true: 2 -> 1

    constructor(public readonly options: SimulationOptions) {
        this.device = options.device;
        this.switch = false;
        this.potentialBuffer = this.device.createBuffer({
            size: options.width * options.height * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.waveFunctionBuffer1 = this.device.createBuffer({
            size: options.width * options.height * Float32Array.BYTES_PER_ELEMENT * 2,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.waveFunctionBuffer2 = this.device.createBuffer({
            size: options.width * options.height * Float32Array.BYTES_PER_ELEMENT * 2,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.potentialBuffer, 0, new Float32Array(options.width * options.height));
        this.device.queue.writeBuffer(this.waveFunctionBuffer1, 0, new Float32Array(options.width * options.height * 2));
        this.device.queue.writeBuffer(this.waveFunctionBuffer2, 0, new Float32Array(options.width * options.height * 2));

        this.stepBuffer = this.device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT * 1,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.stepBuffer, 0, new Float32Array([options.mass]));
        this.stepPipeline = this.device.createComputePipeline({
            compute: {
                module: this.device.createShaderModule({
                    code: stepShaderCode,
                }),
                entryPoint: 'main',
                constants: {
                    width: options.width,
                    height: options.height,
                    dx: options.dx,
                    dt: options.dt,
                    reducedPlanck: options.reducedPlanck,
                }
            },
            layout: 'auto',
        });

        this.updatePotentialByCircleBuffer = this.device.createBuffer({
            size: 4 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.updatePotentialByCirclePipeline = this.device.createComputePipeline({
            compute: {
                module: this.device.createShaderModule({
                    code: updatePotentialByCircleShaderCode,
                }),
                entryPoint: 'main',
                constants: {
                    width: options.width,
                    height: options.height,
                    dx: options.dx,
                }
            },
            layout: 'auto',
        });
        this.updatePotentialByCircleBindGroup = this.device.createBindGroup({
            layout: this.updatePotentialByCirclePipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.potentialBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.updatePotentialByCircleBuffer,
                    },
                },
            ],
        });

        this.gaussianWavePacketBuffer = this.device.createBuffer({
            size: 8 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.gaussianWavePacketPipeline = this.device.createComputePipeline({
            compute: {
                module: this.device.createShaderModule({
                    code: gaussianWavePacketShaderCode,
                }),
                entryPoint: 'main',
                constants: {
                    width: options.width,
                    height: options.height,
                    dx: options.dx,
                }
            },
            layout: 'auto',
        });

        this.multiplyBuffer = this.device.createBuffer({
            size: options.width * options.height * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.multiplyPipeline = this.device.createComputePipeline({
            compute: {
                module: this.device.createShaderModule({
                    code: multiplyShaderCode,
                }),
                entryPoint: 'main',
                constants: {
                    width: options.width,
                    height: options.height,
                }
            },
            layout: 'auto',
        });

        this.normBuffer = this.device.createBuffer({
            size: options.width * options.height * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        this.normReadBuffer = this.device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT*100,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        this.normPipeline = this.device.createComputePipeline({
            compute: {
                module: this.device.createShaderModule({
                    code: normShaderCode,
                }),
                entryPoint: 'main',
                constants: {
                    width: options.width,
                    height: options.height,
                    dx: options.dx,
                }
            },
            layout: 'auto',
        });

        this.reduceAddBuffer = this.device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT*2,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.reduceAddPipeline = this.device.createComputePipeline({
            compute: {
                module: this.device.createShaderModule({
                    code: reduceAddShaderCode,
                }),
                entryPoint: 'main'
            },
            layout: 'auto',
        });

        this.smoothPipeline = this.device.createComputePipeline({
            compute: {
                module: this.device.createShaderModule({
                    code: smoothShaderCode,
                }),
                entryPoint: 'main',
                constants: {
                    width: options.width,
                    height: options.height
                }
            },
            layout: 'auto',
        });
    }
    public setPotentialByFunction(f: (x: number, y: number) => number) {
        const potential = new Float32Array(this.options.width * this.options.height);
        for (let j = 0; j < this.options.height; j++) {
            for (let i = 0; i < this.options.width; i++) {
                potential[j * this.options.width + i] = f(i * this.options.dx, j * this.options.dx);
            }
        }
        this.device.queue.writeBuffer(this.potentialBuffer, 0, potential);
    }
    public async updatePotentialByCircle(x: number, y: number, r: number, v: number) {
        const data = new Float32Array(4);
        data[0] = x;
        data[1] = y;
        data[2] = r;
        data[3] = v;
        this.device.queue.writeBuffer(this.updatePotentialByCircleBuffer, 0, data);
        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.updatePotentialByCirclePipeline);
        pass.setBindGroup(0, this.updatePotentialByCircleBindGroup);
        pass.dispatchWorkgroups(Math.ceil(this.options.width / 8), Math.ceil(this.options.height / 8));
        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
    public step() {
        this.device.queue.writeBuffer(this.stepBuffer, 0, new Float32Array([this.options.mass]));
        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.stepPipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this.stepPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.switch ? this.waveFunctionBuffer2 : this.waveFunctionBuffer1,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.switch ? this.waveFunctionBuffer1 : this.waveFunctionBuffer2,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.potentialBuffer,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.stepBuffer,
                    },
                }
            ],
        }));
        pass.dispatchWorkgroups(Math.ceil(this.options.width / 8), Math.ceil(this.options.height / 8));
        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);

        this.switch = !this.switch;
    }
    public smooth() {
        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.smoothPipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this.smoothPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.switch ? this.waveFunctionBuffer2 : this.waveFunctionBuffer1,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.switch ? this.waveFunctionBuffer1 : this.waveFunctionBuffer2,
                    },
                },
            ],
        }));
        pass.dispatchWorkgroups(Math.ceil(this.options.width / 8), Math.ceil(this.options.height / 8));
        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
        this.switch = !this.switch;
    }
    public async getNorm() {
        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.normPipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this.normPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.switch ? this.waveFunctionBuffer2 : this.waveFunctionBuffer1,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.normBuffer,
                    },
                },
            ],
        }));
        pass.dispatchWorkgroups(Math.ceil(this.options.width / 8), Math.ceil(this.options.height / 8));
        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
        
        let chunksLeft = this.options.width * this.options.height;
        let stride = 1;
        while(chunksLeft > 1) {
            const commandEncoder = this.device.createCommandEncoder();
            const pass = commandEncoder.beginComputePass();
            pass.setPipeline(this.reduceAddPipeline);
            pass.setBindGroup(0, this.device.createBindGroup({
                layout: this.reduceAddPipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.normBuffer,
                        },
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: this.reduceAddBuffer,
                        },
                    },
                ],
            }));
            const dispatchCount = Math.floor(chunksLeft / 2);
            chunksLeft -= dispatchCount;
            this.device.queue.writeBuffer(this.reduceAddBuffer, 0, new Uint32Array([stride, dispatchCount]));
            pass.dispatchWorkgroups(Math.ceil(dispatchCount/4096), 64);
            pass.end();
            this.device.queue.submit([commandEncoder.finish()]);
            stride *= 2;
        }
        {
            const commandEncoder = this.device.createCommandEncoder();
            commandEncoder.copyBufferToBuffer(this.normBuffer, 0, this.normReadBuffer, 0, 100*Float32Array.BYTES_PER_ELEMENT);
            this.device.queue.submit([commandEncoder.finish()]);
        }
        await this.normReadBuffer.mapAsync(GPUMapMode.READ, 0, 100*Float32Array.BYTES_PER_ELEMENT);
        const normChunk = new Float32Array(this.normReadBuffer.getMappedRange());
        // console.log([...normChunk]);
        const r = normChunk[0];
        this.normReadBuffer.unmap();
        return r;
    }
    public gaussianWavePacket(x: number, y: number, sigma: number, kx: number, ky: number) {
        const data = new Float32Array(8);
        data[0] = x;
        data[1] = y;
        data[2] = sigma;
        data[3] = kx;
        data[4] = ky;
        this.device.queue.writeBuffer(this.gaussianWavePacketBuffer, 0, data);
        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.gaussianWavePacketPipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this.gaussianWavePacketPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.switch ? this.waveFunctionBuffer2 : this.waveFunctionBuffer1,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.gaussianWavePacketBuffer,
                    },
                },
            ],
        }));
        pass.dispatchWorkgroups(Math.ceil(this.options.width / 8), Math.ceil(this.options.height / 8));
        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
    public normalize(norm: number) {
        const multiplyBuffer = new Float32Array([Math.sqrt(1/norm)]);
        this.device.queue.writeBuffer(this.multiplyBuffer, 0, multiplyBuffer);

        const commandEncoder = this.device.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.multiplyPipeline);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this.multiplyPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.switch ? this.waveFunctionBuffer2 : this.waveFunctionBuffer1,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.multiplyBuffer,
                    },
                },
            ],
        }));
        pass.dispatchWorkgroups(Math.ceil(this.options.width / 8), Math.ceil(this.options.height / 8));
        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }

    public getPotentialBuffer() {
        return this.potentialBuffer;
    }
    public getWaveFunctionBuffer() {
        return this.switch ? this.waveFunctionBuffer2 : this.waveFunctionBuffer1;
    }
}