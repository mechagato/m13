/** Maximum decoded YAML accepted from a URL hash before parsing or GPU compilation. */
export const MAX_SHARED_SCENE_BYTES = 64 * 1024;

const MAX_SHARED_SCENE_ENCODED_CHARS = Math.ceil((MAX_SHARED_SCENE_BYTES * 4) / 3) + 4;

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
  const match = hash.match(/^#scene=(.+)$/);
  if (!match) return null;
  try {
    return decodeSceneHash(match[1]!);
  } catch {
    return null;
  }
}
