import { describe, expect, it } from 'vitest';
import { parseOverlay } from '../overlay.js';

const SILENT = { silent: true as const };

const VISUAL = `
floor: { concept: piso_madera_envejecida }
walls: { concept: pared_yeso_blanco }
ceiling: { concept: pared_yeso_blanco }
`;

const KIT_NPC = `
    id: miss_luna
    name: Miss Luna
    role: teacher
    position: [0, -2, 2]
    dialog:
      - "Hello!"
`;

describe('npc canónico / npcs alias deprecado', () => {
  it('npcs-only se normaliza a npc', () => {
    const yaml = `
version: "0.3"
name: alias_only
${VISUAL}
npcs:
  - ${KIT_NPC}
`;
    const result = parseOverlay(yaml, SILENT);
    expect(result.overlay.npc).toHaveLength(1);
    expect(result.overlay.npc[0]?.id).toBe('miss_luna');
    expect(result.overlay.npcs).toBeUndefined();
    expect(result.warnings.some((w) => /alias deprecado/.test(w))).toBe(true);
  });

  it('npc + npcs idénticos: se conserva npc y avisa', () => {
    const yaml = `
version: "0.3"
name: alias_same
${VISUAL}
npc:
  - ${KIT_NPC}
npcs:
  - ${KIT_NPC}
`;
    const result = parseOverlay(yaml, SILENT);
    expect(result.overlay.npc).toHaveLength(1);
    expect(result.warnings.some((w) => /idénticas/.test(w))).toBe(true);
  });

  it('npc + npcs distintos → error de validación', () => {
    const yaml = `
version: "0.3"
name: alias_clash
${VISUAL}
npc:
  - ${KIT_NPC}
npcs:
  - id: customer
    role: peer
    position: [2, -2, -2]
    dialog:
      - "Excuse me."
`;
    expect(() => parseOverlay(yaml, SILENT)).toThrow(/npc y npcs ambas pobladas y distintas/);
  });
});
