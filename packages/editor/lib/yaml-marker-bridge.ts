/**
 * Bridge entre los errores Zod del parser .m13 y los markers de Monaco.
 *
 * Cuando el parser falla, su mensaje tiene la forma:
 *   [m13/parser] Escena .m13 inválida:
 *     · objects.0.position — Required
 *     · light.intensity — Expected number, received string
 *
 * Esta función parsea ese mensaje, mapea cada path (`objects.0.position`) a
 * la línea/columna correspondiente del YAML, y produce markers de Monaco
 * (formato `editor.IMarkerData`) para mostrar squiggly lines en el editor.
 *
 * Heurística para mapeo path → línea:
 *  - El último segmento del path (después del último `.`) es el field name
 *  - Buscamos el field en el YAML como `<name>:` y devolvemos esa línea
 *  - Si no se encuentra, fallback a línea 1
 *
 * Es heurístico, no perfecto — pero suficiente para guiar al usuario.
 * Una versión exacta requeriría un parser YAML con source-maps (yaml lib lo
 * soporta pero es overhead para Fase 1).
 */

export interface ParsedZodIssue {
  path: string;
  message: string;
}

export interface YamlMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: 8; // monaco.MarkerSeverity.Error === 8
}

/** Extrae los issues de un Error message del parser m13. */
export function parseM13Error(errorMsg: string): ParsedZodIssue[] {
  const issues: ParsedZodIssue[] = [];
  const lines = errorMsg.split('\n');
  for (const line of lines) {
    // Formato: "  · path.to.field — mensaje"
    const match = line.match(/^\s*·\s+(.+?)\s+—\s+(.+)$/);
    if (match && match[1] && match[2]) {
      issues.push({ path: match[1], message: match[2] });
    }
  }
  return issues;
}

/**
 * Mapea un path Zod (`objects.0.position`) a un YamlMarker en el texto.
 */
export function pathToMarker(yamlText: string, issue: ParsedZodIssue): YamlMarker {
  const segments = issue.path.split('.');
  const lastSegment = segments[segments.length - 1] ?? '';

  // Para paths como "objects.0.position", el field a buscar es el último (position).
  // Si el último es un número (array index), buscar el penúltimo (objects).
  const fieldName = /^\d+$/.test(lastSegment)
    ? segments[segments.length - 2] ?? lastSegment
    : lastSegment;

  const lines = yamlText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // Match "  <fieldName>:" o "- <fieldName>:"
    const re = new RegExp(`(?:^|\\s|-\\s)${escapeRegex(fieldName)}\\s*:`);
    if (re.test(line)) {
      return {
        startLineNumber: i + 1,
        startColumn: 1,
        endLineNumber: i + 1,
        endColumn: line.length + 1,
        message: `${issue.path}: ${issue.message}`,
        severity: 8,
      };
    }
  }

  // Fallback: línea 1
  return {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 100,
    message: `${issue.path}: ${issue.message}`,
    severity: 8,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Convierte el mensaje completo del parser en una lista de markers para Monaco. */
export function errorToMarkers(yamlText: string, errorMsg: string): YamlMarker[] {
  const issues = parseM13Error(errorMsg);
  if (issues.length === 0) {
    // Sin paths parseables — un solo marker en línea 1 con el mensaje completo.
    return [
      {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 100,
        message: errorMsg.replace(/^\[m13\/parser\]\s*/, '').slice(0, 200),
        severity: 8,
      },
    ];
  }
  return issues.map((i) => pathToMarker(yamlText, i));
}
