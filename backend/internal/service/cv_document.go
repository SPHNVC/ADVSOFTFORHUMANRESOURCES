package service

import (
	"fmt"
	"html"
	"strings"
)

// wrapDocument wraps a rendered template body in a standalone, print-ready
// HTML document. The @page rules and print colour adjustments are what let the
// browser's print-to-PDF produce a clean A4 document with no browser chrome.
func wrapDocument(name, body string) string {
	var b strings.Builder
	b.WriteString(`<!doctype html><html lang="en"><head><meta charset="utf-8">`)
	b.WriteString(`<meta name="viewport" content="width=device-width,initial-scale=1">`)
	fmt.Fprintf(&b, `<title>CV %s</title>`, html.EscapeString(name))
	b.WriteString(`<style>`)
	b.WriteString(cvBaseCSS)
	b.WriteString(`</style></head><body>`)
	b.WriteString(body)
	b.WriteString(`</body></html>`)
	return b.String()
}

const cvBaseCSS = `
@page { size: A4; margin: 16mm 14mm; }

*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  padding: 24px;
  background: #f3f4f6;
  font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #111827;
}

.cv {
  max-width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 16mm 14mm;
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

@media print {
  body { padding: 0; background: #fff; }
  .cv {
    max-width: none;
    min-height: 0;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }
  /* Keep chip and heading colours in the printed output. */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cv-section, .cv-item { break-inside: avoid; }
  .cv-section h2 { break-after: avoid; }
}
`
