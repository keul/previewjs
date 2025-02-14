import styled from "@emotion/styled";
import { faUndo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Editor, {
  BeforeMount,
  loader as monacoLoader,
  OnChange,
  OnMount,
  useMonaco,
} from "@monaco-editor/react";
import { observer } from "mobx-react-lite";
import type monaco from "monaco-editor";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { PreviewState } from "..";
import { revalidateMonacoEditor } from "./revalidate-monaco-editor";

monacoLoader.config({
  paths: {
    vs: "/monaco-editor/min/vs",
  },
});

export const PropsEditor = observer(
  ({
    state,
    width,
    height,
  }: {
    state: PreviewState;
    width: number;
    height: number;
  }) => {
    if (!state.component?.details) {
      return null;
    }
    return (
      <UnconnectedPropsEditor
        documentId={state.component.componentId}
        height={height}
        width={width}
        onUpdate={state.updateProps.bind(state)}
        onReset={
          state.component.details.invocation !==
          state.component.details.defaultInvocation
            ? state.resetProps.bind(state)
            : undefined
        }
        source={state.component.details.invocation}
        typeDeclarationsSource={state.component.details.typeDeclarations}
      />
    );
  }
);

const UnconnectedPropsEditor = ({
  documentId,
  source,
  typeDeclarationsSource,
  width,
  height,
  onUpdate,
  onReset,
}: {
  documentId: string;
  source: string;
  typeDeclarationsSource: string;
  width: number;
  height: number;
  onUpdate(source: string): void;
  onReset?(): void;
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const modelRef = useRef<monaco.editor.ITextModel>();
  const [mounted, setMounted] = useState(false);
  const onChange = useCallback<OnChange>(
    (value) => {
      if (value !== undefined && value !== source) {
        onUpdate(value);
      }
    },
    [onUpdate, source]
  );
  useEffect(() => {
    // Scroll back to the top when picking another component.
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    editor.setPosition({
      lineNumber: 1,
      column: Number.MAX_SAFE_INTEGER,
    });
    editor.setScrollTop(0);
  }, [documentId]);
  const monaco = useMonaco();
  useEffect(() => {
    if (monaco) {
      const libUri = monaco.Uri.parse("ts:filename/component.d.tsx");
      const existingModel = monaco.editor.getModel(libUri);
      if (existingModel) {
        existingModel.setValue(typeDeclarationsSource);
      } else {
        monaco.editor.createModel(typeDeclarationsSource, "typescript", libUri);
      }
      if (editorRef.current) {
        revalidateMonacoEditor(monaco, editorRef.current).catch(console.warn);
      }
    }
  }, [monaco, typeDeclarationsSource]);
  useEffect(() => {
    const model = modelRef.current;
    if (!model || model.getValue() === source) {
      return;
    }
    model.setValue(source);
  }, [source, mounted]);
  const beforeMount = useCallback<BeforeMount>((monaco) => {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      noEmit: true,
      jsx: monaco.languages.typescript.JsxEmit.Preserve,
    });
  }, []);
  const onMount = useCallback<OnMount>(
    (editor, monaco) => {
      const usageUri = monaco.Uri.parse("file:///usage.d.tsx");
      const existingModel = monaco.editor.getModel(usageUri);
      if (existingModel) {
        modelRef.current = existingModel;
        existingModel.setValue(source);
      } else {
        modelRef.current = monaco.editor.createModel(
          source,
          "typescript",
          monaco.Uri.parse("file:///usage.d.tsx")
        );
      }
      editorRef.current = editor;
      editor.setModel(modelRef.current);

      // Get rid of buggy auto-generated inmemory models.
      for (const model of monaco.editor.getModels()) {
        if (model.uri.toString().startsWith("inmemory://model/")) {
          model.dispose();
        }
      }

      setMounted(true);
    },
    [source]
  );
  return (
    <>
      <FloatingRefreshButton
        id="editor-refresh-button"
        title="Reset properties"
        disabled={!onReset}
        onClick={onReset}
      >
        <FontAwesomeIcon icon={faUndo} />
      </FloatingRefreshButton>
      <Editor
        width={width}
        height={height}
        theme="vs-dark"
        defaultLanguage="typescript"
        onChange={onChange}
        options={{
          minimap: {
            enabled: false,
          },
          overviewRulerLanes: 0,
          lineNumbers: "off",
          folding: false,
          renderLineHighlight: "none",
          lineDecorationsWidth: 8,
          lineNumbersMinChars: 0,
          scrollbar: {
            vertical: "hidden",
          },
          padding: {
            top: 8,
            bottom: 8,
          },
          fontSize: 14,
        }}
        beforeMount={beforeMount}
        onMount={onMount}
      />
      <div
        id="editor-content"
        data-value={source}
        style={{ display: "none" }}
      />
      {mounted && <div id="editor-ready"></div>}
    </>
  );
};

export const FloatingRefreshButton = styled.button`
  position: absolute;
  bottom: 0;
  z-index: 100;
  background: hsla(213, 100%, 80%, 0.4);
  color: #fff;
  border-radius: 8px;
  padding: 8px;
  width: 32px;
  height: 32px;
  margin: 8px;
  border: none;
  outline: none;
  cursor: pointer;

  &:disabled {
    background: hsla(213, 20%, 60%, 0.1);
    color: #666;
  }
`;
