package service

import (
	"os"
	"regexp"
	"strings"
	"testing"

	"backend/graph/model"
	"backend/internal/docx"
)

// templateFromMigration extracts the $tpl$-quoted template body from a
// migration file.
func templateFromMigration(t *testing.T, path string) string {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration %s: %v", path, err)
	}
	m := regexp.MustCompile(`(?s)\$tpl\$(.*?)\$tpl\$`).FindSubmatch(raw)
	if m == nil {
		t.Fatalf("could not find the $tpl$-quoted template in %s", path)
	}
	return string(m[1])
}

// TestMigrationSeedTemplatesRender pulls each shipped template straight out of
// its migration and renders it, so a broken seed fails here rather than the
// first time someone clicks "Generate CV".
func TestMigrationSeedTemplatesRender(t *testing.T) {
	tests := []struct {
		name  string
		path  string
		wants []string
	}{
		{
			name: "000014 initial Classic template",
			path: "../../migrations/000014_create_cv_templates.up.sql",
			wants: []string{
				"Alexandra Ionescu", "Go", "React",
				"Senior Engineer", "Driving licence", "Own car",
			},
		},
		{
			name: "000016 Classic template with languages",
			path: "../../migrations/000016_add_languages_to_cv_template.up.sql",
			wants: []string{
				"Alexandra Ionescu", "Go", "React",
				"Languages", "English", "Advanced", "C1",
				"Romanian", "Native speaker",
				"Senior Engineer", "Driving licence", "Own car",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tpl := templateFromMigration(t, tt.path)

			if err := validateTemplateHTML(tpl); err != nil {
				t.Fatalf("seeded template fails validation: %v", err)
			}

			out, err := renderTemplate(tpl, sampleCvData())
			if err != nil {
				t.Fatalf("seeded template fails to render: %v", err)
			}
			for _, want := range tt.wants {
				if !strings.Contains(out, want) {
					t.Errorf("seeded template output missing %q", want)
				}
			}
			if strings.Contains(out, "{{") {
				t.Error("seeded template left unresolved template actions")
			}

			blocks, err := docx.FromHTML(out)
			if err != nil {
				t.Fatalf("seeded template failed docx conversion: %v", err)
			}
			if len(blocks) == 0 {
				t.Error("seeded template produced no docx blocks")
			}
		})
	}
}

// TestLanguageLevelLabelsCoverEnum guards against a CEFR level being added to
// the GraphQL enum without a matching human-readable label. It walks the
// generated enum rather than a copied list, so the check cannot go stale.
func TestLanguageLevelLabelsCoverEnum(t *testing.T) {
	for _, level := range model.AllLanguageLevel {
		if languageLevelLabels[string(level)] == "" {
			t.Errorf("no label defined for language level %q", level)
		}
	}
}
