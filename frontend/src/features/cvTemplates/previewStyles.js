/**
 * Mirrors `cvBaseCSS` in backend/internal/service/cv_document.go so the editor
 * preview matches the generated document. Keep the two in sync.
 */
export const CV_PREVIEW_CSS = `
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  padding: 16px;
  background: #f3f4f6;
  font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #111827;
}

.cv {
  max-width: 210mm;
  margin: 0 auto;
  padding: 14mm 12mm;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 8px 24px rgba(0,0,0,.08);
}

.cv-header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
.cv-header h1 { margin: 0 0 6px; font-size: 26pt; font-weight: 700; letter-spacing: -.5px; }

.cv-contact { margin: 0; color: #4b5563; font-size: 10pt; }
.cv-contact span:not(:last-child)::after { content: " · "; color: #9ca3af; }

.cv-section { margin-bottom: 20px; }
.cv-section h2 {
  margin: 0 0 10px;
  font-size: 12pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: #2563eb;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 4px;
}

.cv-item { margin-bottom: 14px; }
.cv-item:last-child { margin-bottom: 0; }
.cv-item-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.cv-item-head h3 { margin: 0; font-size: 11.5pt; font-weight: 600; }
.cv-item p { margin: 4px 0 0; color: #374151; }

.cv-dates { flex-shrink: 0; font-size: 9.5pt; color: #6b7280; white-space: nowrap; }

.cv-chips { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 0; padding: 0; }
.cv-chips li {
  padding: 3px 10px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 9.5pt;
}

.cv-languages { list-style: none; margin: 0; padding: 0; }
.cv-languages li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 3px 0;
  border-bottom: 1px dotted #e5e7eb;
}
.cv-languages li:last-child { border-bottom: none; }
.cv-lang-name { font-weight: 600; }
.cv-lang-level { font-size: 9.5pt; color: #6b7280; white-space: nowrap; }

.cv-section ul:not(.cv-chips):not(.cv-languages) { margin: 0; padding-left: 18px; }
.cv-section ul:not(.cv-chips):not(.cv-languages) li { margin-bottom: 3px; }
`
