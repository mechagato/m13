/**
 * Security skeleton (canon §2) — classification + share modes.
 * No server-side vault yet: private mode refuses cleartext #scene= URLs.
 */

import { createHash } from 'node:crypto';

/** Data classification — aligned with docs/plans/plan-canonico-plataforma.md §2.2 */
export type DataClass = 'S0' | 'S1' | 'S2' | 'S3';

/** How a scene may be distributed */
export type ShareVisibility = 'public' | 'private_local';

export interface SecurityPolicy {
  /** Default TTL if any server ever stores a blob (hours). 0 = retain nothing. */
  retention_ttl_hours: number;
  /** Never put raw YAML/CAD into LLM logs or ChatGPT thread for S2/S3 */
  forbid_payload_in_llm_logs: boolean;
  /** Public #scene= only allowed for S0/S1 */
  allow_public_hash_share: boolean;
}

const POLICY_BY_CLASS: Record<DataClass, SecurityPolicy> = {
  S0: { retention_ttl_hours: 0, forbid_payload_in_llm_logs: false, allow_public_hash_share: true },
  S1: { retention_ttl_hours: 0, forbid_payload_in_llm_logs: false, allow_public_hash_share: true },
  S2: { retention_ttl_hours: 24, forbid_payload_in_llm_logs: true, allow_public_hash_share: false },
  S3: { retention_ttl_hours: 1, forbid_payload_in_llm_logs: true, allow_public_hash_share: false },
};

export function policyFor(classification: DataClass): SecurityPolicy {
  return POLICY_BY_CLASS[classification];
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Resolve effective visibility. Confidential classes cannot "upgrade" to public
 * via a mistaken flag — public is forced off for S2/S3.
 */
export function resolveShareVisibility(
  classification: DataClass,
  requested: ShareVisibility = 'public',
): ShareVisibility {
  const policy = policyFor(classification);
  if (!policy.allow_public_hash_share) return 'private_local';
  return requested;
}

export interface PrivateShareDescriptor {
  mode: 'private_local';
  classification: DataClass;
  scene_hash: string;
  bytes: number;
  retention_ttl_hours: number;
  /** Placeholder until portal token publish ships (D2) */
  portal_publish_path: string;
  instructions: string;
  /** Explicit: adapters must not echo YAML back into chat for these classes */
  do_not_echo_yaml_in_chat: true;
}

export function buildPrivateShareDescriptor(
  yaml: string,
  classification: DataClass,
): PrivateShareDescriptor {
  const policy = policyFor(classification);
  const scene_hash = sha256Hex(yaml);
  return {
    mode: 'private_local',
    classification,
    scene_hash,
    bytes: Buffer.byteLength(yaml, 'utf8'),
    retention_ttl_hours: policy.retention_ttl_hours,
    portal_publish_path: `/p/{id}?token=…  (D2 — tokenized publish; not live yet)`,
    instructions:
      'CONFIDENTIAL share: do not embed YAML in a public #scene= URL or paste the full scene into ChatGPT. ' +
      'Transfer the .m13 file via the customer vault / airgap, or wait for portal token publish. ' +
      `Integrity hash (sha256): ${scene_hash}`,
    do_not_echo_yaml_in_chat: true,
  };
}
