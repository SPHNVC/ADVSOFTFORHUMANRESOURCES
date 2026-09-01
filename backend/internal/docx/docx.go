// Package docx builds minimal WordprocessingML documents from a restricted
// subset of HTML. A .docx is a ZIP archive of XML parts, so this needs no
// third-party dependency.
package docx

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"strings"

	"golang.org/x/net/html"
)

// Block is one paragraph-level element in the output document.
type Block struct {
	Style string // heading1 | heading2 | heading3 | listItem | normal
	Runs  []Run
}

// Run is a span of text with uniform formatting.
type Run struct {
	Text   string
	Bold   bool
	Italic bool
}

const (
	styleHeading1 = "heading1"
	styleHeading2 = "heading2"
	styleHeading3 = "heading3"
	styleListItem = "listItem"
	styleNormal   = "normal"
)

// FromHTML parses an HTML fragment into document blocks. Unknown elements are
// traversed transparently so their text is preserved.
func FromHTML(fragment string) ([]Block, error) {
	root, err := html.Parse(strings.NewReader(fragment))
	if err != nil {
		return nil, fmt.Errorf("parse cv html: %w", err)
	}
	w := &walker{}
	w.walk(root, Run{})
	w.flush()
	return w.blocks, nil
}

type walker struct {
	blocks  []Block
	current *Block
}

func (w *walker) walk(n *html.Node, fmtState Run) {
	switch n.Type {
	case html.TextNode:
		text := normalizeSpace(n.Data)
		if text == "" {
			return
		}
		if w.current == nil {
			w.current = &Block{Style: styleNormal}
		}
		run := fmtState
		run.Text = text
		w.current.Runs = append(w.current.Runs, run)
		return

	case html.ElementNode:
		switch n.Data {
		case "script", "style", "head":
			return
		case "br":
			w.flush()
			return
		case "h1":
			w.startBlock(styleHeading1)
		case "h2":
			w.startBlock(styleHeading2)
		case "h3", "h4", "h5", "h6":
			w.startBlock(styleHeading3)
		case "li":
			w.startBlock(styleListItem)
		case "p", "div", "section", "article", "header", "footer", "tr":
			w.flush()
		case "b", "strong":
			fmtState.Bold = true
		case "i", "em":
			fmtState.Italic = true
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		w.walk(c, fmtState)
	}

	if n.Type == html.ElementNode {
		switch n.Data {
		case "h1", "h2", "h3", "h4", "h5", "h6", "li",
			"p", "div", "section", "article", "header", "footer", "tr":
			w.flush()
		}
	}
}

func (w *walker) startBlock(style string) {
	w.flush()
	w.current = &Block{Style: style}
}

func (w *walker) flush() {
	if w.current != nil && len(w.current.Runs) > 0 {
		w.blocks = append(w.blocks, *w.current)
	}
	w.current = nil
}

// normalizeSpace collapses runs of whitespace, mirroring HTML rendering.
func normalizeSpace(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

// Build writes the blocks as a .docx archive.
func Build(blocks []Block) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	parts := []struct{ name, body string }{
		{"[Content_Types].xml", contentTypesXML},
		{"_rels/.rels", rootRelsXML},
		{"word/_rels/document.xml.rels", documentRelsXML},
		{"word/styles.xml", stylesXML},
		{"word/document.xml", documentXML(blocks)},
	}
	for _, p := range parts {
		f, err := zw.Create(p.name)
		if err != nil {
			return nil, fmt.Errorf("create docx part %s: %w", p.name, err)
		}
		if _, err := f.Write([]byte(p.body)); err != nil {
			return nil, fmt.Errorf("write docx part %s: %w", p.name, err)
		}
	}
	if err := zw.Close(); err != nil {
		return nil, fmt.Errorf("finalize docx: %w", err)
	}
	return buf.Bytes(), nil
}

func documentXML(blocks []Block) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`)
	b.WriteString(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>`)
	for _, blk := range blocks {
		b.WriteString(`<w:p>`)
		if pr := paragraphProps(blk.Style); pr != "" {
			b.WriteString(pr)
		}
		for _, run := range blk.Runs {
			b.WriteString(`<w:r>`)
			if run.Bold || run.Italic {
				b.WriteString(`<w:rPr>`)
				if run.Bold {
					b.WriteString(`<w:b/>`)
				}
				if run.Italic {
					b.WriteString(`<w:i/>`)
				}
				b.WriteString(`</w:rPr>`)
			}
			b.WriteString(`<w:t xml:space="preserve">`)
			b.WriteString(escapeXML(run.Text))
			b.WriteString(`</w:t></w:r>`)
		}
		b.WriteString(`</w:p>`)
	}
	b.WriteString(`<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>`)
	b.WriteString(`<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>`)
	b.WriteString(`</w:sectPr></w:body></w:document>`)
	return b.String()
}

func paragraphProps(style string) string {
	switch style {
	case styleHeading1:
		return `<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>`
	case styleHeading2:
		return `<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>`
	case styleHeading3:
		return `<w:pPr><w:pStyle w:val="Heading3"/></w:pPr>`
	case styleListItem:
		return `<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr><w:ind w:left="720"/></w:pPr>`
	default:
		return ""
	}
}

func escapeXML(s string) string {
	var b bytes.Buffer
	if err := xml.EscapeText(&b, []byte(s)); err != nil {
		return ""
	}
	return b.String()
}
