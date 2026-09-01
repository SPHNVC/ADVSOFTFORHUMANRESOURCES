package docx

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"io"
	"strings"
	"testing"
)

func TestFromHTML(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		expected []Block
	}{
		{
			name: "headings and paragraph",
			html: `<h1>Jane Doe</h1><h2>Skills</h2><p>Go developer</p>`,
			expected: []Block{
				{Style: styleHeading1, Runs: []Run{{Text: "Jane Doe"}}},
				{Style: styleHeading2, Runs: []Run{{Text: "Skills"}}},
				{Style: styleNormal, Runs: []Run{{Text: "Go developer"}}},
			},
		},
		{
			name: "list items become separate blocks",
			html: `<ul><li>Go</li><li>React</li></ul>`,
			expected: []Block{
				{Style: styleListItem, Runs: []Run{{Text: "Go"}}},
				{Style: styleListItem, Runs: []Run{{Text: "React"}}},
			},
		},
		{
			name: "inline formatting is preserved",
			html: `<p>plain <strong>bold</strong> <em>italic</em></p>`,
			expected: []Block{
				{Style: styleNormal, Runs: []Run{
					{Text: "plain"},
					{Text: "bold", Bold: true},
					{Text: "italic", Italic: true},
				}},
			},
		},
		{
			name: "nested formatting combines",
			html: `<p><strong><em>both</em></strong></p>`,
			expected: []Block{
				{Style: styleNormal, Runs: []Run{{Text: "both", Bold: true, Italic: true}}},
			},
		},
		{
			name: "whitespace-only nodes are dropped",
			html: "<div>\n   \n</div><p>kept</p>",
			expected: []Block{
				{Style: styleNormal, Runs: []Run{{Text: "kept"}}},
			},
		},
		{
			name: "script content is skipped",
			html: `<p>safe</p><script>alert(1)</script>`,
			expected: []Block{
				{Style: styleNormal, Runs: []Run{{Text: "safe"}}},
			},
		},
		{
			name: "unknown elements stay transparent",
			html: `<p>a <span>b</span> c</p>`,
			expected: []Block{
				{Style: styleNormal, Runs: []Run{
					{Text: "a"}, {Text: "b"}, {Text: "c"},
				}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := FromHTML(tt.html)
			if err != nil {
				t.Fatalf("FromHTML() error = %v", err)
			}
			if len(got) != len(tt.expected) {
				t.Fatalf("got %d blocks, want %d: %+v", len(got), len(tt.expected), got)
			}
			for i := range got {
				if got[i].Style != tt.expected[i].Style {
					t.Errorf("block %d style = %q, want %q", i, got[i].Style, tt.expected[i].Style)
				}
				if len(got[i].Runs) != len(tt.expected[i].Runs) {
					t.Fatalf("block %d: got %d runs, want %d: %+v",
						i, len(got[i].Runs), len(tt.expected[i].Runs), got[i].Runs)
				}
				for j := range got[i].Runs {
					if got[i].Runs[j] != tt.expected[i].Runs[j] {
						t.Errorf("block %d run %d = %+v, want %+v",
							i, j, got[i].Runs[j], tt.expected[i].Runs[j])
					}
				}
			}
		})
	}
}

// TestBuildProducesValidPackage checks the archive has every part Word
// requires and that each part is well-formed XML.
func TestBuildProducesValidPackage(t *testing.T) {
	blocks, err := FromHTML(`<h1>Jane Doe</h1><p>A & B <strong>bold</strong></p><li>item</li>`)
	if err != nil {
		t.Fatalf("FromHTML() error = %v", err)
	}
	raw, err := Build(blocks)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		t.Fatalf("output is not a valid zip: %v", err)
	}

	required := map[string]bool{
		"[Content_Types].xml":          false,
		"_rels/.rels":                  false,
		"word/_rels/document.xml.rels": false,
		"word/styles.xml":              false,
		"word/document.xml":            false,
	}

	for _, f := range zr.File {
		if _, ok := required[f.Name]; ok {
			required[f.Name] = true
		}
		rc, err := f.Open()
		if err != nil {
			t.Fatalf("open %s: %v", f.Name, err)
		}
		body, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			t.Fatalf("read %s: %v", f.Name, err)
		}
		// Every part must be well-formed XML.
		dec := xml.NewDecoder(bytes.NewReader(body))
		for {
			_, err := dec.Token()
			if err == io.EOF {
				break
			}
			if err != nil {
				t.Fatalf("%s is not well-formed XML: %v", f.Name, err)
			}
		}
	}

	for name, found := range required {
		if !found {
			t.Errorf("missing required part %s", name)
		}
	}
}

// TestBuildEscapesXML guards against a name like "A & B" corrupting the package.
func TestBuildEscapesXML(t *testing.T) {
	raw, err := Build([]Block{
		{Style: styleNormal, Runs: []Run{{Text: `A & B <tag> "quo"`}}},
	})
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		t.Fatalf("zip: %v", err)
	}
	var doc string
	for _, f := range zr.File {
		if f.Name != "word/document.xml" {
			continue
		}
		rc, _ := f.Open()
		b, _ := io.ReadAll(rc)
		rc.Close()
		doc = string(b)
	}
	if strings.Contains(doc, "A & B") {
		t.Error("raw ampersand leaked into document.xml")
	}
	if !strings.Contains(doc, "&amp;") {
		t.Error("ampersand was not escaped")
	}
	if strings.Contains(doc, "<tag>") {
		t.Error("raw angle brackets leaked into document.xml")
	}
}
