import React, { useCallback, useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { cn } from '@/lib/utils';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onImageUpload?: (file: File) => Promise<string>;
  availableVariables?: string[];
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = 'Écrivez votre contenu ici...',
  className,
  minHeight = '200px',
  onImageUpload,
  availableVariables = [],
}: WysiwygEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  // Custom image handler
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const quill = quillRef.current?.getEditor();
        if (quill) {
          // Show loading indicator
          const range = quill.getSelection(true);
          
          if (onImageUpload) {
            try {
              const url = await onImageUpload(file);
              quill.insertEmbed(range.index, 'image', url);
              quill.setSelection(range.index + 1);
            } catch (error) {
              console.error('Image upload failed:', error);
              // Error handling should be done in the parent component via onImageUpload
            }
          } else {
            // Fallback to base64 encoding
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              quill.insertEmbed(range.index, 'image', base64);
              quill.setSelection(range.index + 1);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };
  }, [onImageUpload]);

  // Insert variable at cursor position
  const insertVariable = useCallback((variable: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range.index, variable);
      quill.setSelection(range.index + variable.length);
    }
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['link', 'image'],
          ['blockquote', 'code-block'],
          ['clean'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    [imageHandler]
  );

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'align',
    'list',
    'bullet',
    'indent',
    'link',
    'image',
    'blockquote',
    'code-block',
  ];

  return (
    <div className={cn('space-y-2', className)}>
      {availableVariables.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-md border">
          <span className="text-xs text-gray-500 mr-2">Variables:</span>
          {availableVariables.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-0.5 rounded transition-colors cursor-pointer"
            >
              {variable}
            </button>
          ))}
        </div>
      )}
      <div className="wysiwyg-editor-container">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{ minHeight }}
        />
      </div>
      <style>{`
        .wysiwyg-editor-container .ql-container {
          min-height: ${minHeight};
          font-family: Arial, sans-serif;
        }
        .wysiwyg-editor-container .ql-editor {
          min-height: ${minHeight};
        }
        .wysiwyg-editor-container .ql-toolbar {
          background: #f9fafb;
          border-color: #e5e7eb;
          border-radius: 6px 6px 0 0;
        }
        .wysiwyg-editor-container .ql-container {
          border-color: #e5e7eb;
          border-radius: 0 0 6px 6px;
        }
        .wysiwyg-editor-container .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
      `}</style>
    </div>
  );
}

export default WysiwygEditor;
