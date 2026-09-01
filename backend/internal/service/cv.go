package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"html/template"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"backend/graph/model"
	"backend/internal/docx"
)

// CvService renders CVs from stored HTML templates.
//
// The CV data set deliberately excludes comments, status and project
// assignments: a CV is an outward-facing document and those fields are
// internal-only.
type CvService struct {
	db *sqlx.DB
}

func NewCvService(db *sqlx.DB) *CvService {
	return &CvService{db: db}
}

// --- template data ------------------------------------------------------

// cvSkill / cvActivity / cvResource are the shapes exposed to template
// authors. They are intentionally decoupled from the DB rows so a schema
// change does not silently break every stored template.
type cvSkill struct {
	Name        string
	Description string
}

type cvActivity struct {
	Name        string
	Description string
	StartDate   string
	EndDate     string
}

type cvLanguage struct {
	Name  string // e.g. "English"
	Level string // raw CEFR code, e.g. "C1"
	Label string // human-readable, e.g. "Advanced"
}

type cvResource struct {
	Name           string
	Birthdate      string
	Age            string
	Email          string
	Phone          string
	Location       string
	Address        string
	City           string
	County         string
	Country        string
	DrivingLicence bool
	Car            bool
	Availability   string
	Skills         []cvSkill
	Languages      []cvLanguage
	Activities     []cvActivity
}

type cvData struct {
	Resource    cvResource
	GeneratedAt string
}

// languageLevelLabels turns CEFR codes into wording a CV reader understands.
var languageLevelLabels = map[string]string{
	"A1":     "Beginner",
	"A2":     "Elementary",
	"B1":     "Intermediate",
	"B2":     "Upper intermediate",
	"C1":     "Advanced",
	"C2":     "Proficient",
	"NATIVE": "Native speaker",
}

var availabilityLabels = map[string]string{
	"ASAP":         "Immediately",
	"ONE_WEEK":     "1 week",
	"TWO_WEEKS":    "2 weeks",
	"THREE_WEEKS":  "3 weeks",
}

// --- template CRUD ------------------------------------------------------

type cvTemplateRow struct {
	ID          int64     `db:"id"`
	Name        string    `db:"name"`
	Description *string   `db:"description"`
	HTML        string    `db:"html"`
	IsDefault   bool      `db:"is_default"`
	CreatedAt   time.Time `db:"created_at"`
	ModifiedAt  time.Time `db:"modified_at"`
}

const cvTemplateCols = `id, name, description, html, is_default, created_at, modified_at`

func (r *cvTemplateRow) toModel() *model.CvTemplate {
	return &model.CvTemplate{
		ID:          strconv.FormatInt(r.ID, 10),
		Name:        r.Name,
		Description: r.Description,
		HTML:        r.HTML,
		IsDefault:   r.IsDefault,
		CreatedAt:   r.CreatedAt.UTC().Format("2006-01-02 15:04"),
		ModifiedAt:  r.ModifiedAt.UTC().Format("2006-01-02 15:04"),
	}
}

func (s *CvService) ListTemplates(ctx context.Context) ([]*model.CvTemplate, error) {
	var rows []cvTemplateRow
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT `+cvTemplateCols+` FROM cv_templates ORDER BY is_default DESC, name`,
	); err != nil {
		return nil, fmt.Errorf("list cv templates: %w", err)
	}
	out := make([]*model.CvTemplate, len(rows))
	for i := range rows {
		out[i] = rows[i].toModel()
	}
	return out, nil
}

func (s *CvService) GetTemplate(ctx context.Context, id string) (*model.CvTemplate, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid cv template id: %w", err)
	}
	var row cvTemplateRow
	if err := s.db.QueryRowxContext(ctx,
		`SELECT `+cvTemplateCols+` FROM cv_templates WHERE id=$1`, numID,
	).StructScan(&row); err != nil {
		return nil, fmt.Errorf("get cv template: %w", err)
	}
	return row.toModel(), nil
}

func (s *CvService) CreateTemplate(ctx context.Context, input model.CreateCvTemplateInput) (*model.CvTemplate, error) {
	if err := validateTemplateHTML(input.HTML); err != nil {
		return nil, err
	}
	isDefault := input.IsDefault != nil && *input.IsDefault

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin create cv template: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // no-op once committed

	if isDefault {
		if _, err := tx.ExecContext(ctx,
			`UPDATE cv_templates SET is_default=FALSE WHERE is_default`); err != nil {
			return nil, fmt.Errorf("clear existing default: %w", err)
		}
	}
	var row cvTemplateRow
	if err := tx.QueryRowxContext(ctx,
		`INSERT INTO cv_templates (name, description, html, is_default)
		 VALUES ($1,$2,$3,$4)
		 RETURNING `+cvTemplateCols,
		input.Name, input.Description, input.HTML, isDefault,
	).StructScan(&row); err != nil {
		return nil, fmt.Errorf("create cv template: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit create cv template: %w", err)
	}
	return row.toModel(), nil
}

func (s *CvService) UpdateTemplate(ctx context.Context, id string, input model.UpdateCvTemplateInput) (*model.CvTemplate, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid cv template id: %w", err)
	}
	if err := validateTemplateHTML(input.HTML); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin update cv template: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // no-op once committed

	if input.IsDefault {
		if _, err := tx.ExecContext(ctx,
			`UPDATE cv_templates SET is_default=FALSE WHERE is_default AND id<>$1`, numID); err != nil {
			return nil, fmt.Errorf("clear existing default: %w", err)
		}
	}
	var row cvTemplateRow
	if err := tx.QueryRowxContext(ctx,
		`UPDATE cv_templates SET
		   name=$1, description=$2, html=$3, is_default=$4, modified_at=NOW()
		 WHERE id=$5
		 RETURNING `+cvTemplateCols,
		input.Name, input.Description, input.HTML, input.IsDefault, numID,
	).StructScan(&row); err != nil {
		return nil, fmt.Errorf("update cv template: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit update cv template: %w", err)
	}
	return row.toModel(), nil
}

func (s *CvService) DeleteTemplate(ctx context.Context, id string) (bool, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid cv template id: %w", err)
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM cv_templates WHERE id=$1`, numID)
	if err != nil {
		return false, fmt.Errorf("delete cv template: %w", err)
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// --- rendering ----------------------------------------------------------

func (s *CvService) Render(ctx context.Context, resourceID, templateID string, format model.CvFormat) (*model.RenderedCv, error) {
	tpl, err := s.GetTemplate(ctx, templateID)
	if err != nil {
		return nil, err
	}
	data, err := s.loadCvData(ctx, resourceID)
	if err != nil {
		return nil, err
	}

	body, err := renderTemplate(tpl.HTML, data)
	if err != nil {
		return nil, err
	}
	full := wrapDocument(data.Resource.Name, body)

	out := &model.RenderedCv{
		ResourceID: resourceID,
		TemplateID: templateID,
		FileName:   buildFileName(data.Resource.Name, format),
		HTML:       full,
	}

	if format == model.CvFormatDocx {
		blocks, err := docx.FromHTML(body)
		if err != nil {
			return nil, fmt.Errorf("convert cv to docx blocks: %w", err)
		}
		raw, err := docx.Build(blocks)
		if err != nil {
			return nil, fmt.Errorf("build docx: %w", err)
		}
		encoded := base64.StdEncoding.EncodeToString(raw)
		out.DocxBase64 = &encoded
	}
	return out, nil
}

func renderTemplate(tplHTML string, data cvData) (string, error) {
	t, err := template.New("cv").Parse(tplHTML)
	if err != nil {
		return "", gqlerror.Errorf("template is not valid: %v", err)
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", gqlerror.Errorf("template failed to render: %v", err)
	}
	return buf.String(), nil
}

// loadCvData assembles the CV payload. Comments, status and project
// assignments are intentionally not queried.
func (s *CvService) loadCvData(ctx context.Context, resourceID string) (cvData, error) {
	numID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return cvData{}, fmt.Errorf("invalid resource id: %w", err)
	}

	var row resourceRow
	if err := s.db.QueryRowxContext(ctx,
		`SELECT `+resourceCols+` FROM resources WHERE id=$1`, numID,
	).StructScan(&row); err != nil {
		return cvData{}, fmt.Errorf("load resource for cv: %w", err)
	}

	var skills []cvSkill
	if err := s.db.SelectContext(ctx, &skills,
		`SELECT s.name, COALESCE(s.description, '') AS description
		 FROM resource_skills rs
		 JOIN skills s ON s.id = rs.skill_id
		 WHERE rs.resource_id = $1
		 ORDER BY s.name`, numID,
	); err != nil {
		return cvData{}, fmt.Errorf("load skills for cv: %w", err)
	}

	var langRows []struct {
		Name  string `db:"name"`
		Level string `db:"level"`
	}
	if err := s.db.SelectContext(ctx, &langRows,
		`SELECT l.name, rl.level
		 FROM resource_languages rl
		 JOIN languages l ON l.id = rl.language_id
		 WHERE rl.resource_id = $1
		 ORDER BY l.name`, numID,
	); err != nil {
		return cvData{}, fmt.Errorf("load languages for cv: %w", err)
	}
	languages := make([]cvLanguage, len(langRows))
	for i, l := range langRows {
		label := languageLevelLabels[l.Level]
		if label == "" {
			label = l.Level
		}
		languages[i] = cvLanguage{Name: l.Name, Level: l.Level, Label: label}
	}

	var actRows []resourceActivityRow
	if err := s.db.SelectContext(ctx, &actRows,
		`SELECT `+resourceActivityCols+`
		 FROM resource_activities
		 WHERE resource_id=$1
		 ORDER BY start_date DESC, id DESC`, numID,
	); err != nil {
		return cvData{}, fmt.Errorf("load activities for cv: %w", err)
	}
	activities := make([]cvActivity, len(actRows))
	for i, a := range actRows {
		activities[i] = cvActivity{
			Name:      a.Name,
			StartDate: a.StartDate.Format("01/2006"),
			EndDate:   a.EndDate.Format("01/2006"),
		}
		if a.Description != nil {
			activities[i].Description = *a.Description
		}
	}

	res := cvResource{
		Name:           row.Name,
		DrivingLicence: row.DrivingLicence,
		Car:            row.Car,
		Skills:         skills,
		Languages:      languages,
		Activities:     activities,
	}
	res.Birthdate = derefStr(row.Birthdate)
	res.Email = derefStr(row.Email)
	res.Phone = derefStr(row.Phone)
	res.City = derefStr(row.City)
	res.County = derefStr(row.County)
	res.Country = derefStr(row.Country)
	res.Age = computeAge(row.Birthdate)
	res.Address = joinNonEmpty(", ",
		joinNonEmpty(" ", derefStr(row.Street), derefStr(row.Number)),
		prefixNonEmpty("Bl. ", derefStr(row.Block)),
		prefixNonEmpty("Ap. ", derefStr(row.Flat)),
		derefStr(row.ZipCode),
	)
	res.Location = joinNonEmpty(", ", res.City, res.County, res.Country)
	if row.Availability != nil {
		if label, ok := availabilityLabels[*row.Availability]; ok {
			res.Availability = label
		} else {
			res.Availability = *row.Availability
		}
	}

	return cvData{
		Resource:    res,
		GeneratedAt: time.Now().UTC().Format("2 January 2006"),
	}, nil
}

// --- helpers ------------------------------------------------------------

// forbiddenTags keeps stored templates from carrying active content. Templates
// are admin-authored, but they are rendered into every user's browser, so a
// stored template is a stored-XSS vector if left unchecked.
var forbiddenTags = regexp.MustCompile(`(?is)<\s*(script|iframe|object|embed|link|meta|base)\b`)

func validateTemplateHTML(tplHTML string) error {
	if strings.TrimSpace(tplHTML) == "" {
		return gqlerror.Errorf("template html must not be empty")
	}
	if forbiddenTags.MatchString(tplHTML) {
		return gqlerror.Errorf("template must not contain script, iframe, object, embed, link, meta or base tags")
	}
	if _, err := template.New("validate").Parse(tplHTML); err != nil {
		return gqlerror.Errorf("template is not valid: %v", err)
	}
	return nil
}

func computeAge(birthdate *string) string {
	if birthdate == nil || *birthdate == "" {
		return ""
	}
	bd, err := time.Parse("2006-01-02", *birthdate)
	if err != nil {
		return ""
	}
	now := time.Now()
	years := now.Year() - bd.Year()
	if now.YearDay() < bd.YearDay() {
		years--
	}
	if years < 0 {
		return ""
	}
	return strconv.Itoa(years)
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func joinNonEmpty(sep string, parts ...string) string {
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if strings.TrimSpace(p) != "" {
			out = append(out, strings.TrimSpace(p))
		}
	}
	return strings.Join(out, sep)
}

func prefixNonEmpty(prefix, s string) string {
	if strings.TrimSpace(s) == "" {
		return ""
	}
	return prefix + s
}

var nonFileNameChars = regexp.MustCompile(`[^\p{L}\p{N}]+`)

func buildFileName(name string, format model.CvFormat) string {
	slug := strings.Trim(nonFileNameChars.ReplaceAllString(name, "_"), "_")
	if slug == "" {
		slug = "cv"
	}
	ext := "pdf"
	if format == model.CvFormatDocx {
		ext = "docx"
	}
	return fmt.Sprintf("CV_%s.%s", slug, ext)
}
