import { describe, expect, it, vi } from 'vitest';
import { renderEyePass, renderFrame, type RendererState } from '../index.js';

function makeRendererState() {
  const pass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    draw: vi.fn(),
    end: vi.fn(),
    setViewport: vi.fn(),
  };
  const beginRenderPass = vi.fn(() => pass);
  const finish = vi.fn(() => ({ command: true }));
  const encoder = { beginRenderPass, finish };
  const createCommandEncoder = vi.fn(() => encoder);
  const submit = vi.fn();
  const targetView = { target: true } as unknown as GPUTextureView;
  const state = {
    device: { createCommandEncoder, queue: { submit } },
    context: { getCurrentTexture: vi.fn(() => ({ createView: vi.fn(() => targetView) })) },
    pipeline: { pipeline: true },
    bindGroup: { bindGroup: true },
  } as unknown as RendererState;

  return { state, pass, beginRenderPass, createCommandEncoder, submit, targetView };
}

describe('renderer render passes', () => {
  it('renders a 2D frame by clearing, drawing, and submitting once', () => {
    const { state, pass, beginRenderPass, submit } = makeRendererState();

    renderFrame(state);

    expect(beginRenderPass).toHaveBeenCalledWith(expect.objectContaining({
      colorAttachments: [expect.objectContaining({ loadOp: 'clear', storeOp: 'store' })],
    }));
    expect(pass.setPipeline).toHaveBeenCalledWith(state.pipeline);
    expect(pass.setBindGroup).toHaveBeenCalledWith(0, state.bindGroup);
    expect(pass.draw).toHaveBeenCalledWith(3);
    expect(pass.end).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it.each([
    [true, 'clear'],
    [false, 'load'],
  ] as const)('uses %s -> %s for an XR eye pass', (clear, loadOp) => {
    const { state, pass, beginRenderPass, targetView } = makeRendererState();
    const encoder = { beginRenderPass } as unknown as GPUCommandEncoder;
    const viewport = { x: 100, y: 0, width: 200, height: 150 };

    renderEyePass(state, encoder, targetView, viewport, clear);

    expect(beginRenderPass).toHaveBeenCalledWith(expect.objectContaining({
      colorAttachments: [expect.objectContaining({ view: targetView, loadOp, storeOp: 'store' })],
    }));
    expect(pass.setViewport).toHaveBeenCalledWith(100, 0, 200, 150, 0, 1);
    expect(pass.setPipeline).toHaveBeenCalledWith(state.pipeline);
    expect(pass.setBindGroup).toHaveBeenCalledWith(0, state.bindGroup);
    expect(pass.draw).toHaveBeenCalledWith(3);
    expect(pass.end).toHaveBeenCalledTimes(1);
  });
});
