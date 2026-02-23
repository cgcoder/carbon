import React, { useState, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { Stack, Text, Group } from '@mantine/core';

// ~19px per line × 26 lines
const EXPANDED_HEIGHT = '500px';

export type CodeLanguage = 'json' | 'javascript' | 'html' | 'text';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: CodeLanguage;
  label?: string;
  description?: React.ReactNode;
  error?: string;
  placeholder?: string;
  minHeight?: string;
  actions?: React.ReactNode;
  required?: boolean;
}

function getExtensions(language: CodeLanguage) {
  switch (language) {
    case 'json': return [json()];
    case 'javascript': return [javascript()];
    case 'html': return [html()];
    default: return [];
  }
}

export function CodeEditor({
  value,
  onChange,
  language = 'text',
  label,
  description,
  error,
  placeholder,
  minHeight = '120px',
  actions,
  required,
}: CodeEditorProps) {
  const extensions = getExtensions(language);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(true);
  };

  // Small delay so clicking the actions bar (e.g. "Format JSON") doesn't
  // immediately collapse the editor before the click handler fires.
  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setFocused(false), 150);
  };

  return (
    <Stack gap={4}>
      {(label || actions) && (
        <Group justify="space-between" align="center">
          {label && (
            <Text size="sm" fw={500}>
              {label}
              {required && <span style={{ color: 'var(--mantine-color-red-6)', marginLeft: 4 }}>*</span>}
            </Text>
          )}
          {actions}
        </Group>
      )}
      <div
        onMouseDown={() => {
          // Prevent blur from firing when clicking inside the wrapper
          // (e.g. scrollbar, gutter) so the editor stays expanded.
          if (blurTimer.current) clearTimeout(blurTimer.current);
        }}
        style={{
          border: `1px solid ${error ? 'var(--mantine-color-red-6)' : focused ? 'var(--mantine-color-primary)' : 'var(--mantine-color-default-border)'}`,
          borderRadius: 'var(--mantine-radius-sm)',
          overflow: 'hidden',
          fontSize: '13px',
          transition: 'border-color 0.15s ease',
        }}
      >
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={extensions}
          height={focused ? EXPANDED_HEIGHT : undefined}
          minHeight={focused ? undefined : minHeight}
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            searchKeymap: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
          }}
          style={{ fontFamily: 'var(--mantine-font-family-monospace, monospace)' }}
        />
      </div>
      {description && <Text size="xs" c="dimmed">{description}</Text>}
      {error && <Text size="xs" c="red">{error}</Text>}
    </Stack>
  );
}
