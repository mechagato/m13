/** Maximum decoded YAML accepted from a URL hash before parsing or GPU compilation. */
export const MAX_SHARED_SCENE_BYTES = 64 * 1024;
/** URL conservadora: replays mayores se comparten como archivo .m13replay. */
export const MAX_SHARED_REPLAY_BYTES = 24 * 1024;

const MAX_SHARED_SCENE_ENCODED_CHARS = Math.ceil((MAX_SHARED_SCENE_BYTES * 4) / 3) + 4;
const MAX_SHARED_REPLAY_ENCODED_CHARS = Math.ceil((MAX_SHARED_REPLAY_BYTES * 4) / 3) + 4;

export function encodeSceneHash(yaml: string): string {
  const bytes = new TextEncoder().encode(yaml);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSceneHash(encoded: string): string {
  if (encoded.length > MAX_SHARED_SCENE_ENCODED_CHARS) {
    throw new Error('[m13/share] enlace de escena excede el límite permitido');
  }
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_SHARED_SCENE_BYTES) {
    throw new Error('[m13/share] escena compartida excede el límite permitido');
  }
  return new TextDecoder().decode(bytes);
}

export function readSharedSceneHash(hash: string): string | null {
  const match = hash.match(/^#scene=([^&]+)(?:&.*)?$/);
  if (!match) return null;
  try {
    return decodeSceneHash(match[1]!);
  } catch {
    return null;
  }
}

export function encodeReplayHash(replay: string): string {
  return encodeSceneHash(replay);
}

export function decodeReplayHash(encoded: string): string {
  if (encoded.length > MAX_SHARED_REPLAY_ENCODED_CHARS) {
    throw new Error('[m13/share] enlace de replay excede el limite permitido');
  }
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_SHARED_REPLAY_BYTES) {
    throw new Error('[m13/share] replay compartido excede el limite permitido');
  }
  return new TextDecoder().decode(bytes);
}

export function readSharedReplayHash(hash: string): string | null {
  if (!hash.startsWith('#')) return null;
  const encoded = new URLSearchParams(hash.slice(1)).get('replay');
  if (!encoded) return null;
  try {
    return decodeReplayHash(encoded);
  } catch {
    return null;
  }
}

/** Construye un link combinado solo si la escena y el replay caben en la URL. */
export function createSharedReplayHash(sceneYaml: string, replay: string): string | null {
  if (new TextEncoder().encode(sceneYaml).byteLength > MAX_SHARED_SCENE_BYTES) return null;
  if (new TextEncoder().encode(replay).byteLength > MAX_SHARED_REPLAY_BYTES) return null;
  return `#scene=${encodeSceneHash(sceneYaml)}&replay=${encodeReplayHash(replay)}`;
}
