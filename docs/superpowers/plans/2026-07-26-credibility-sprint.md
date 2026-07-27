# Credibility Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the deployed m13 demo technically honest: correct stereo XR rendering, test critical renderer paths, remove known high-severity production advisories, and align public claims with measured evidence.

**Architecture:** Keep the local-first WebGPU runtime in scope. Correct the XR render-pass contract first, then add fake-GPU tests and enforce them in CI. Dependency and documentation work remain isolated into independently reviewable commits.

**Tech Stack:** TypeScript, WGSL/WebGPU types, Vitest 3, pnpm 9, Next.js, Vite, GitHub Actions, Cloudflare Pages.

## Global Constraints

- Runtime remains 100% local-first: no cloud calls during rendering.
- WebGPU remains the only rendering API; do not add WebGL or Three.js to runtime.
- LLM remains editor-time only.
- Existing v0.1 scenes must keep byte-identical WGSL hashes.
- Fase 5 is not closed until T-501/T-513 are recorded from a Quest.
- Public claims must be measured facts or explicitly labeled future work.
- No new runtime dependencies.

---

## File Map

- Modify: packages/runtime/src/engine.ts - XR session lifecycle and per-eye pass order.
- Modify: packages/runtime/src/renderer/index.ts - render-pass clear/load contract.
- Create: packages/runtime/src/__tests__/engine-xr.test.ts - fake XR lifecycle and two-eye order.
- Create: packages/runtime/src/renderer/__tests__/render-passes.test.ts - fake GPU command encoder assertions.
- Create: packages/runtime/src/__tests__/engine-load-strict.test.ts - public scene boundary validation.
- Modify: vitest.config.ts and .github/workflows/ci.yml - enforced quality gates.
- Modify: packages/editor/package.json, packages/mcp/package.json, pnpm-lock.yaml - advisory remediation.
- Modify: README.md, docs/papers/phase-1-benchmark.md, CHANGELOG.md, BITACORA_MOTOR13.md, phi-companion/fichas/estado-vivo.md, docs/tasks/phase-5-tasks.md, docs/DEPLOY.md - truthful status and evidence.

### Task 1: Correct Stereo XR and Make Initialization Transactional

**Files:**
- Modify: packages/runtime/src/engine.ts:428-545
- Modify: packages/runtime/src/renderer/index.ts:389-422
- Create: packages/runtime/src/renderer/__tests__/render-passes.test.ts
- Create: packages/runtime/src/__tests__/engine-xr.test.ts

**Interfaces:**
- Consumes: renderEyePass(state, encoder, targetView, viewport, clear).
- Produces: only the first XR eye clears the shared projection texture; later eyes load it.
- Produces: failed enterXR() leaves no session or XR state behind.

- [ ] **Step 1: Write the failing renderer contract tests**

~~~ts
it('uses load when encoding an eye after the first eye', () => {
  const beginRenderPass = vi.fn(() => fakePass);
  const encoder = { beginRenderPass } as unknown as GPUCommandEncoder;

  renderEyePass(fakeRendererState, encoder, fakeView, viewport, false);

  expect(beginRenderPass).toHaveBeenCalledWith(expect.objectContaining({
    colorAttachments: [expect.objectContaining({ loadOp: 'load', storeOp: 'store' })],
  }));
});
~~~

- [ ] **Step 2: Write the failing two-eye engine test**

Mock XRGPUBinding, a frame containing two views, writeUniforms, renderEyePass, and queue.submit. Initialize a M13Engine with fake core/resources, invoke the private frame handler through a test-only typed cast, then assert:

~~~ts
expect(renderEyePass).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), expect.anything(), expect.anything(), true);
expect(renderEyePass).toHaveBeenNthCalledWith(2, expect.anything(), expect.anything(), expect.anything(), expect.anything(), false);
~~~

- [ ] **Step 3: Run the focused tests before implementation**

Run: pnpm test -- packages/runtime/src/renderer/__tests__/render-passes.test.ts packages/runtime/src/__tests__/engine-xr.test.ts

Expected: FAIL because the tests do not exist and engine currently sends true for both eyes.

- [ ] **Step 4: Apply the minimum rendering fix**

Replace the unconditional last argument in onXRFrame:

~~~ts
renderEyePass(this.renderer!, encoder, sub.colorTexture.createView(), vp, i === 0);
~~~

Keep one submission per eye because each eye must consume the uniform write immediately preceding its encoder.

- [ ] **Step 5: Make enterXR transactional**

Wrap all operations after requestSession() in try/catch. On failure call session.end(), clear xrSession/xrBinding/xrLayer/xrRefSpace/xrCamera, and restore preXRQuality. Test a rejected requestReferenceSpace() and assert end() was called and isXRActive() is false.

- [ ] **Step 6: Verify and commit**

Run: pnpm test -- packages/runtime/src/renderer/__tests__/render-passes.test.ts packages/runtime/src/__tests__/engine-xr.test.ts

Expected: PASS.

~~~bash
git add packages/runtime/src/engine.ts packages/runtime/src/renderer/index.ts packages/runtime/src/__tests__/engine-xr.test.ts packages/runtime/src/renderer/__tests__/render-passes.test.ts
git commit -m "fix(runtime): preserve both eyes in XR render passes"
~~~

### Task 2: Cover Renderer Paths and Enforce CI Gates

**Files:**
- Modify: vitest.config.ts:19-37
- Modify: .github/workflows/ci.yml:35-72
- Modify: packages/examples/src/main.ts:454
- Modify: packages/generator/src/index.ts:517-518
- Modify: packages/runtime/src/parser/__tests__/parser-errors.test.ts:173-174
- Modify: packages/runtime/src/renderer/__tests__/render-passes.test.ts

**Interfaces:**
- Consumes: fake GPU tests from Task 1.
- Produces: CI fails on lint errors, full workspace build failures, high production advisories, and critical renderer/runtime coverage regressions.

- [ ] **Step 1: Cover 2D renderer behavior**

Add tests for renderFrame() asserting clear, draw(3), end(), and one submit; test renderEyePass() with clear true and false.

~~~ts
expect(fakePass.setPipeline).toHaveBeenCalledWith(fakeRendererState.pipeline);
expect(fakePass.setBindGroup).toHaveBeenCalledWith(0, fakeRendererState.bindGroup);
expect(fakePass.draw).toHaveBeenCalledWith(3);
expect(fakeRendererState.device.queue.submit).toHaveBeenCalledTimes(1);
~~~

- [ ] **Step 2: Measure coverage**

Run: pnpm test:coverage

Expected: renderer and XR engine paths show covered lines. Do not set thresholds until this test cycle passes.

- [ ] **Step 3: Set nonzero coverage floors**

Set the Vitest thresholds below. Add tests rather than lowering them.

~~~ts
thresholds: {
  lines: 70,
  functions: 65,
  branches: 65,
  statements: 70,
  'packages/runtime/src/engine.ts': { lines: 65, functions: 65, branches: 60, statements: 65 },
  'packages/runtime/src/renderer/index.ts': { lines: 65, functions: 65, branches: 60, statements: 65 },
},
~~~

- [ ] **Step 4: Make CI run the complete release gate**

Insert these steps after tests:

~~~yaml
      - name: Lint
        run: pnpm lint --max-warnings 0

      - name: Full workspace build
        run: pnpm build

      - name: Production dependency audit
        run: pnpm audit --prod --audit-level high
~~~

Fix the five current lint warnings: remove the unnecessary escape in examples/main.ts and replace literal double spaces in the three regex locations with {2}.

- [ ] **Step 5: Verify and commit**

Run: pnpm lint --max-warnings 0
Run: pnpm test:coverage
Run: pnpm build

Expected: all exit 0.

~~~bash
git add vitest.config.ts .github/workflows/ci.yml packages/examples/src/main.ts packages/generator/src/index.ts packages/runtime/src/parser/__tests__/parser-errors.test.ts packages/runtime/src/renderer/__tests__/render-passes.test.ts
git commit -m "test(ci): gate renderer coverage and release checks"
~~~

### Task 3: Reject Unknown Fields at the Public Scene Boundary

**Files:**
- Modify: packages/runtime/src/engine.ts:199-200
- Create: packages/runtime/src/__tests__/engine-load-strict.test.ts
- Modify: packages/runtime/README.md:132-143

**Interfaces:**
- Consumes: parseScene(yamlText, { strict: true }).
- Produces: M13Engine.loadScene() rejects unknown root and nested fields from shared URL scenes and external .m13 URLs.

- [ ] **Step 1: Write the failing engine tests**

Use the existing renderer module mock pattern from engine-cache.test.ts.

~~~ts
await expect(engine.loadScene(validSceneWith('debug: true')))
  .rejects.toThrow('campos desconocidos');
await expect(engine.loadScene(validSceneWith('materail: metal_dorado_pulido')))
  .rejects.toThrow('campos desconocidos');
~~~

- [ ] **Step 2: Verify the current permissive behavior fails the test**

Run: pnpm test -- packages/runtime/src/__tests__/engine-load-strict.test.ts

Expected: FAIL because loadScene() calls parseScene(text) with no strict option.

- [ ] **Step 3: Apply strict parsing only in M13Engine**

~~~ts
const scene = parseScene(text, { strict: true });
~~~

Do not change parseScene defaults: internal tools can retain explicit permissive control, but all interactive engine loading is trustworthy.

- [ ] **Step 4: Document and verify**

Document that M13Engine.loadScene() is always strict.

Run: pnpm test
Run: pnpm gen:hashes
Run: git diff --exit-code m13-spec/scene-hashes.json

Expected: all existing v0.1 scenes pass and no WGSL hash changes.

- [ ] **Step 5: Commit**

~~~bash
git add packages/runtime/src/engine.ts packages/runtime/src/__tests__/engine-load-strict.test.ts packages/runtime/README.md
git commit -m "fix(runtime): reject unknown fields when loading scenes"
~~~

### Task 4: Remove High-Severity Production Advisories

**Files:**
- Modify: packages/editor/package.json:20-21
- Modify: packages/mcp/package.json:31
- Modify: pnpm-lock.yaml
- Modify if Next migration requires it: packages/editor/next.config.mjs, packages/editor/app/*, packages/editor/components/*

**Interfaces:**
- Produces: editor compatible with Next.js ^15.5.21.
- Produces: pnpm audit --prod --audit-level high exits 0.

- [ ] **Step 1: Raise the patched Next.js floor**

Change the direct editor dependencies together:

~~~json
"next": "^15.5.21",
"eslint-config-next": "^15.5.21"
~~~

Keep React 18 unless pnpm reports a peer incompatibility; if it does, upgrade react and react-dom together to the peer range reported by pnpm.

- [ ] **Step 2: Update the direct MCP SDK**

Run: pnpm --filter @m13/mcp up @modelcontextprotocol/sdk@latest
Run: pnpm install --frozen-lockfile

Expected: package manifests and pnpm-lock.yaml record the resolved graph.

- [ ] **Step 3: Resolve all high findings without hiding them**

Run: pnpm audit --prod --audit-level high

Expected: exit 0. Do not use pnpm overrides merely to conceal an unresolved advisory. If a remaining advisory comes from the MCP SDK, move that direct SDK dependency to a release that removes the vulnerable dependency path.

- [ ] **Step 4: Validate migration and commit**

Run: pnpm typecheck
Run: pnpm test
Run: pnpm build

~~~bash
git add packages/editor/package.json packages/mcp/package.json pnpm-lock.yaml packages/editor
git commit -m "chore(deps): remediate production security advisories"
~~~

### Task 5: Align the Public Narrative with Evidence

**Files:**
- Modify: README.md:1-83
- Modify: docs/papers/phase-1-benchmark.md:1-18,42-83
- Modify: CHANGELOG.md:1-65

**Interfaces:**
- Produces: public documentation that separates implemented code, measured results, and future research.

- [ ] **Step 1: Remove present-tense claims for absent work**

Remove ONNX inference, Gaussian Splatting, foveation, NPU allocation, and 90 fps from the present-tense architecture diagram. Add Future research naming Fases 3 and 4 as unimplemented.

- [ ] **Step 2: Correct release status**

Set README status to: Fases 1 and 2 complete; Fase 5 implemented in code, pending Quest hardware validation; Fase 6 drafted, not started. Use https://m13.phi-core.com as canonical demo URL and identify motor13.neonodos.com only as a verified alias.

- [ ] **Step 3: Use benchmark wording that cannot imply performance**

Replace the short claim with:

~~~md
- **30.8x smaller scene assets** in one reproducible textured-room comparison (2,014 B .m13 vs 62,115 B Three.js HTML, JS, and textures). Including engine bundles, the measured first-load ratio is approximately 2.5x. This is not an FPS benchmark.
~~~

Keep methodology and limitations in the benchmark paper.

- [ ] **Step 4: Add the changelog entry and verify wording**

Add an Unreleased Credibility Sprint section: XR bug corrected, Quest validation pending, dependency remediation, strict scene loading, and benchmark framing.

Run: rg -n -i '90 fps|foveat|ONNX|Gaussian Splatting|Phase 1 complete|Fase 5.*complete' README.md CHANGELOG.md

Expected: only explicit future or pending references remain.

- [ ] **Step 5: Commit**

~~~bash
git add README.md docs/papers/phase-1-benchmark.md CHANGELOG.md
git commit -m "docs: align public claims with verified m13 evidence"
~~~

### Task 6: Record an Honest Quest Gate and Release Evidence

**Files:**
- Modify: BITACORA_MOTOR13.md
- Modify: phi-companion/fichas/estado-vivo.md
- Modify: docs/tasks/phase-5-tasks.md:7-35
- Modify: docs/DEPLOY.md

**Interfaces:**
- Produces: one source of truth stating code is corrected but T-501/T-513 remain hardware blockers.
- Produces: a repeatable Quest evidence record.

- [ ] **Step 1: Record the corrected defect**

Add a bitácora entry: T-507 previously cleared the shared projection texture for both eyes; it now clears only the first eye; fake-GPU tests cover the contract; Quest validation remains required. Record the audit result before and after dependency remediation.

- [ ] **Step 2: Keep the phase gate truthful**

Set Fase 5 wording to: implementation corrected and CI verified; T-501/T-513 remain STOPPER GATO. Do not say validated production, complete, or quote stereo FPS until the Quest evidence exists.

- [ ] **Step 3: Add this Quest record template to DEPLOY.md**

~~~md
| Date | Quest browser version | URL | Scene | Preset | Both eyes rendered | FPS sustained 60 s | Locomotion | Result |
|---|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | | https://m13.phi-core.com | chichen_itza.m13 | quest_xr | pass/fail | | pass/fail | pass/fail |
~~~

- [ ] **Step 4: Run final local evidence checks**

Run: pnpm lint --max-warnings 0
Run: pnpm test:coverage
Run: pnpm build
Run: pnpm audit --prod --audit-level high
Run: git diff --check

Expected: every command exits 0 and generated drift files are reviewed.

- [ ] **Step 5: Commit continuity**

~~~bash
git add BITACORA_MOTOR13.md phi-companion/fichas/estado-vivo.md docs/tasks/phase-5-tasks.md docs/DEPLOY.md
git commit -m "docs: record credibility sprint and Quest gate"
~~~

## Closure Checklist

- [ ] Only the first XR eye clears the projection texture.
- [ ] Failed XR initialization ends its session and returns the engine to a usable 2D state.
- [ ] Renderer and XR paths have fake-GPU tests and nonzero enforced coverage.
- [ ] CI runs lint, test coverage, full build, drift guards, bundle check, and production audit.
- [ ] pnpm audit --prod --audit-level high exits 0.
- [ ] Shared and loaded scenes reject unknown keys.
- [ ] README, benchmark, changelog, bitácora, and estado-vivo distinguish code, evidence, and pending Quest validation.
- [ ] A recorded Quest run exists before Fase 5 can be closed.

## Self-Review

- Spec coverage: XR is Task 1; proof and CI are Task 2; scene integrity is Task 3; dependency security is Task 4; public claims are Task 5; continuity and hardware evidence are Task 6.
- Placeholder scan: every task contains file targets, concrete commands, and acceptance criteria.
- Type consistency: renderEyePass keeps its boolean clear contract; only the engine caller changes from unconditional true to i === 0.

## Execution Handoff

Plan complete and saved to docs/superpowers/plans/2026-07-26-credibility-sprint.md.

1. **Subagent-Driven (recommended)** - dispatch a fresh agent per task, review between tasks.
2. **Inline Execution** - execute tasks in this session with checkpoints after Tasks 1, 2, 4, and 6.

