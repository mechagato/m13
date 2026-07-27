'use client';

import { Editor, type OnChange, type OnMount } from '@monaco-editor/react';
import type * as MonacoType from 'monaco-editor';
import { type JSX, useEffect, useRef } from 'react';
import type { YamlMarker } from '@/lib/yaml-marker-bridge';

export interface MonacoYamlProps {
  value: string;
  onChange: (next: string) => void;
  /** Markers que pintar (errores Zod mapeados a líneas). */
  markers?: YamlMarker[];
}

/**
 * Monaco editor en modo YAML con tema oscuro m13.
 * Markers de error se sincronizan vía monaco.editor.setModelMarkers.
 */
export function MonacoYaml({ value, onChange, markers = [] }: MonacoYamlProps): JSX.Element {
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoType | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Tema dark m13
    monaco.editor.defineTheme('m13-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.yaml', foreground: 'c9a227' },
        { token: 'type.yaml', foreground: '5da662' },
        { token: 'number.yaml', foreground: 'e8e4d8' },
        { token: 'comment.yaml', foreground: '7c7a73', fontStyle: 'italic' },
        { token: 'string.key.yaml', foreground: '8aa6c8' },
      ],
      colors: {
        'editor.background': '#0e1014',
        'editor.foreground': '#e8e4d8',
        'editor.lineHighlightBackground': '#1a1d24',
        'editorLineNumber.foreground': '#3a3c43',
        'editorLineNumber.activeForeground': '#7c7a73',
        'editorCursor.foreground': '#c9a227',
        'editor.selectionBackground': '#2a2c33',
        'editorIndentGuide.background': '#1a1d24',
        'editor.findMatchHighlightBackground': '#c9a22744',
      },
    });
    monaco.editor.setTheme('m13-dark');
  };

  // Sincronizar markers cuando cambian
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(model, 'm13', markers as MonacoType.editor.IMarkerData[]);
  }, [markers]);

  const handleChange: OnChange = (next) => {
    if (next !== undefined) onChange(next);
  };

  return (
    <div className="h-full w-full">
      <Editor
        language="yaml"
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          fontSize: 13,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
          renderWhitespace: 'selection',
          smoothScrolling: true,
          cursorBlinking: 'phase',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 12, bottom: 12 },
          glyphMargin: false,
          folding: true,
          lineNumbersMinChars: 3,
        }}
      />
    </div>
  );
}
