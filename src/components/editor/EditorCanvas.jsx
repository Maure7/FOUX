import { useRef, useMemo, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { syncCanvasScrollbars } from '../../utils/canvasScrollbars';

function neutralizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('meta[http-equiv]').forEach(meta => {
    if (meta.httpEquiv.toLowerCase() === 'refresh') meta.remove();
  });
  const base = doc.querySelector('base') || doc.createElement('base');
  base.target = '_blank';
  if (!base.isConnected) doc.head.prepend(base);
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export default function EditorCanvas({ initialHtml, documentVersion = 0, onFileSelect, iframeRef, onIframeLoad, canvasRef, isPreview, t }) {
  const fileInputRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const root = document.documentElement;
    const sync = () => syncCanvasScrollbars(iframe.contentDocument, root.dataset.theme);
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    iframe.addEventListener('load', sync);
    sync();
    return () => {
      observer.disconnect();
      iframe.removeEventListener('load', sync);
    };
  }, [iframeRef, initialHtml, documentVersion]);

  const safeHtml = useMemo(
    () => (initialHtml ? neutralizeHtml(initialHtml) : null),
    [initialHtml]
  );

  const handleClick = () => {
    if (!initialHtml) fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div ref={canvasRef} className={`editor-canvas${isPreview ? ' editor-canvas--expanded' : ''}`}>
      {safeHtml ? (
        <iframe
          key={documentVersion}
          ref={iframeRef}
          className="editor-canvas__iframe"
          srcDoc={safeHtml}
          title="HTML Preview Canvas"
          sandbox="allow-same-origin"
          onLoad={onIframeLoad}
        />
      ) : (
        <div
          className="editor-dropzone"
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
        >
          <div className="editor-dropzone__icon-wrapper">
            <Upload size={36} />
          </div>
          <span className="editor-dropzone__title">
            {t('editor.dropzoneTitle')}
          </span>
          <span className="editor-dropzone__hint">
            {t('editor.dropzoneHint')}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            className="editor-dropzone__input"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
}

