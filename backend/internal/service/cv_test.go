package service

import (
	"archive/zip"
	"bytes"
	"io"
	"strings"
	"testing"

	"backend/graph/model"
	"backend/internal/docx"
)

func sampleCvData() cvData {
	return cvData{
		Resource: cvResource{
			Name:           "Alexandra Ionescu",
			Email:          "alexandra@example.com",
			Phone:          "+40 721 555 019",
			Location:       "Cluj-Napoca, Cluj, Romania",
			DrivingLicence: true,
			Car:            true,
			Skills: []cvSkill{
				{Name: "Go"},
				{Name: "React"},
			},
			Languages: []cvLanguage{
				{Name: "English", Level: "C1", Label: "Advanced"},
				{Name: "Romanian", Level: "NATIVE", Label: "Native speaker"},
			},
			Activities: []cvActivity{
				{Name: "Senior Engineer", Description: "Led the API rewrite.", StartDate: "03/2022", EndDate: "11/2025"},
			},
		},
		GeneratedAt: "28 July 2026",
	}
}

// seededTemplate is the template shipped in migration 000014. Keeping a copy
// here guards against the migration and the renderer drifting apart.
const seededTemplate = `<article class="cv">
  <header class="cv-header">
    <h1>{{ .Resource.Name }}</h1>
    <p class="cv-contact">
      {{ with .Resource.Email }}<span>{{ . }}</span>{{ end }}
      {{ with .Resource.Phone }}<span>{{ . }}</span>{{ end }}
    </p>
  </header>
  {{ if .Resource.Skills }}
  <section class="cv-section">
    <h2>Skills</h2>
    <ul class="cv-chips">{{ range .Resource.Skills }}<li>{{ .Name }}</li>{{ end }}</ul>
  </section>
  {{ end }}
  {{ if .Resource.Activities }}
  <section class="cv-section">
    <h2>Experience</h2>
    {{ range .Resource.Activities }}
    <div class="cv-item">
      <h3>{{ .Name }}</h3>
      <span class="cv-dates">{{ .StartDate }} &ndash; {{ .EndDate }}</span>
      {{ with .Description }}<p>{{ . }}</p>{{ end }}
    </div>
    {{ end }}
  </section>
  {{ end }}
</article>`

func TestRenderTemplateSeeded(t *testing.T) {
	got, err := renderTemplate(seededTemplate, sampleCvData())
	if err != nil {
		t.Fatalf("renderTemplate() error = %v", err)
	}
	for _, want := range []string{
		"Alexandra Ionescu",
		"alexandra@example.com",
		"<li>Go</li>",
		"<li>React</li>",
		"Senior Engineer",
		"03/2022",
		"Led the API rewrite.",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("rendered CV missing %q", want)
		}
	}
	if strings.Contains(got, "{{") {
		t.Error("rendered CV still contains unresolved template actions")
	}
}

// TestRenderTemplateEscapesUserData is the important one: resource data is
// user-supplied and must not be able to inject markup into the CV.
func TestRenderTemplateEscapesUserData(t *testing.T) {
	data := sampleCvData()
	data.Resource.Name = `<script>alert(1)</script>`
	got, err := renderTemplate(`<h1>{{ .Resource.Name }}</h1>`, data)
	if err != nil {
		t.Fatalf("renderTemplate() error = %v", err)
	}
	if strings.Contains(got, "<script>") {
		t.Errorf("user data was not escaped: %s", got)
	}
}

func TestRenderTemplateRejectsBadSyntax(t *testing.T) {
	if _, err := renderTemplate(`{{ range .Resource.Skills }}`, sampleCvData()); err == nil {
		t.Error("expected an error for a template with no {{ end }}")
	}
}

func TestValidateTemplateHTML(t *testing.T) {
	tests := []struct {
		name    string
		html    string
		wantErr bool
	}{
		{"valid", `<h1>{{ .Resource.Name }}</h1>`, false},
		{"empty", "   ", true},
		{"script tag", `<h1>x</h1><script>alert(1)</script>`, true},
		{"script tag spaced", `< script >alert(1)</script>`, true},
		{"script uppercase", `<SCRIPT>alert(1)</SCRIPT>`, true},
		{"iframe", `<iframe src="x"></iframe>`, true},
		{"object", `<object data="x"></object>`, true},
		{"base tag", `<base href="http://evil">`, true},
		{"unbalanced action", `{{ if .Resource.Car }}`, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateTemplateHTML(tt.html)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateTemplateHTML() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestSeededTemplateToDocx exercises the full HTML -> DOCX path the DOCX
// download depends on.
func TestSeededTemplateToDocx(t *testing.T) {
	body, err := renderTemplate(seededTemplate, sampleCvData())
	if err != nil {
		t.Fatalf("renderTemplate() error = %v", err)
	}
	blocks, err := docx.FromHTML(body)
	if err != nil {
		t.Fatalf("docx.FromHTML() error = %v", err)
	}
	raw, err := docx.Build(blocks)
	if err != nil {
		t.Fatalf("docx.Build() error = %v", err)
	}

	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		t.Fatalf("output is not a valid zip: %v", err)
	}
	var doc string
	for _, f := range zr.File {
		if f.Name != "word/document.xml" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			t.Fatalf("open document.xml: %v", err)
		}
		b, _ := io.ReadAll(rc)
		rc.Close()
		doc = string(b)
	}
	if doc == "" {
		t.Fatal("word/document.xml is missing or empty")
	}
	for _, want := range []string{"Alexandra Ionescu", "Skills", "Go", "React", "Senior Engineer"} {
		if !strings.Contains(doc, want) {
			t.Errorf("docx document.xml missing %q", want)
		}
	}
}

func TestBuildFileName(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		format model.CvFormat
		want   string
	}{
		{"simple pdf", "Alexandra Ionescu", model.CvFormatPDF, "CV_Alexandra_Ionescu.pdf"},
		{"simple docx", "Alexandra Ionescu", model.CvFormatDocx, "CV_Alexandra_Ionescu.docx"},
		{"punctuation stripped", "O'Brien, Seán-Paul", model.CvFormatPDF, "CV_O_Brien_Seán_Paul.pdf"},
		{"path traversal is neutralised", "../../etc/passwd", model.CvFormatPDF, "CV_etc_passwd.pdf"},
		{"empty falls back", "", model.CvFormatPDF, "CV_cv.pdf"},
		{"symbols only fall back", "!!!", model.CvFormatDocx, "CV_cv.docx"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildFileName(tt.input, tt.format); got != tt.want {
				t.Errorf("buildFileName(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestComputeAge(t *testing.T) {
	tests := []struct {
		name  string
		input *string
		want  string
	}{
		{"nil", nil, ""},
		{"empty", strPtr(""), ""},
		{"malformed", strPtr("18-04-1991"), ""},
		{"valid", strPtr("1991-04-18"), ""}, // asserted below as non-empty
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeAge(tt.input)
			if tt.name == "valid" {
				if got == "" {
					t.Error("computeAge() returned empty for a valid birthdate")
				}
				return
			}
			if got != tt.want {
				t.Errorf("computeAge() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestJoinNonEmpty(t *testing.T) {
	if got := joinNonEmpty(", ", "Cluj", "", "  ", "Romania"); got != "Cluj, Romania" {
		t.Errorf("joinNonEmpty() = %q, want %q", got, "Cluj, Romania")
	}
	if got := joinNonEmpty(", ", "", "  "); got != "" {
		t.Errorf("joinNonEmpty() = %q, want empty", got)
	}
}

func strPtr(s string) *string { return &s }
