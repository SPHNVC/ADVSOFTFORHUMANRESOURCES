package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"backend/graph/model"
)

// uniqueViolation is the PostgreSQL error code for a unique constraint breach.
const uniqueViolation = "23505"

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && string(pqErr.Code) == uniqueViolation
}

type LanguageService struct {
	db *sqlx.DB
}

func NewLanguageService(db *sqlx.DB) *LanguageService {
	return &LanguageService{db: db}
}

type languageRow struct {
	ID   int64  `db:"id"`
	Name string `db:"name"`
}

func (r *languageRow) toModel() *model.Language {
	return &model.Language{
		ID:   strconv.FormatInt(r.ID, 10),
		Name: r.Name,
	}
}

type resourceLanguageRow struct {
	ResourceID int64  `db:"resource_id"`
	LanguageID int64  `db:"language_id"`
	Name       string `db:"name"`
	Level      string `db:"level"`
}

func (r *resourceLanguageRow) toModel() *model.ResourceLanguage {
	resourceID := strconv.FormatInt(r.ResourceID, 10)
	languageID := strconv.FormatInt(r.LanguageID, 10)
	return &model.ResourceLanguage{
		// The join table has a composite key; a derived id keeps the GraphQL
		// node addressable and stable for Apollo's cache.
		ID:         resourceID + ":" + languageID,
		ResourceID: resourceID,
		LanguageID: languageID,
		Name:       r.Name,
		Level:      model.LanguageLevel(r.Level),
	}
}

func (s *LanguageService) List(ctx context.Context) ([]*model.Language, error) {
	var rows []languageRow
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT id, name FROM languages ORDER BY name`,
	); err != nil {
		return nil, fmt.Errorf("list languages: %w", err)
	}
	out := make([]*model.Language, len(rows))
	for i := range rows {
		out[i] = rows[i].toModel()
	}
	return out, nil
}

func (s *LanguageService) Create(ctx context.Context, input model.CreateLanguageInput) (*model.Language, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, gqlerror.Errorf("language name must not be empty")
	}
	var row languageRow
	err := s.db.QueryRowxContext(ctx,
		`INSERT INTO languages (name) VALUES ($1) RETURNING id, name`, name,
	).StructScan(&row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, gqlerror.Errorf("a language named %q already exists", name)
		}
		return nil, fmt.Errorf("create language: %w", err)
	}
	return row.toModel(), nil
}

func (s *LanguageService) Delete(ctx context.Context, id string) (bool, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid language id: %w", err)
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM languages WHERE id = $1`, numID)
	if err != nil {
		return false, fmt.Errorf("delete language: %w", err)
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (s *LanguageService) ListByResource(ctx context.Context, resourceID string) ([]*model.ResourceLanguage, error) {
	rID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	var rows []resourceLanguageRow
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT rl.resource_id, rl.language_id, l.name, rl.level
		 FROM resource_languages rl
		 JOIN languages l ON l.id = rl.language_id
		 WHERE rl.resource_id = $1
		 ORDER BY l.name`, rID,
	); err != nil {
		return nil, fmt.Errorf("list resource languages: %w", err)
	}
	out := make([]*model.ResourceLanguage, len(rows))
	for i := range rows {
		out[i] = rows[i].toModel()
	}
	return out, nil
}

// Set adds the language to the resource, or updates the level when the pair
// already exists, so the caller does not need to know which case applies.
func (s *LanguageService) Set(ctx context.Context, input model.SetResourceLanguageInput) (*model.ResourceLanguage, error) {
	rID, err := strconv.ParseInt(input.ResourceID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	lID, err := strconv.ParseInt(input.LanguageID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid language id: %w", err)
	}
	var row resourceLanguageRow
	err = s.db.QueryRowxContext(ctx,
		`INSERT INTO resource_languages (resource_id, language_id, level)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (resource_id, language_id) DO UPDATE SET level = EXCLUDED.level
		 RETURNING resource_id, language_id, level,
		           (SELECT name FROM languages WHERE id = $2) AS name`,
		rID, lID, string(input.Level),
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("set resource language: %w", err)
	}
	return row.toModel(), nil
}

func (s *LanguageService) Remove(ctx context.Context, resourceID, languageID string) (bool, error) {
	rID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid resource id: %w", err)
	}
	lID, err := strconv.ParseInt(languageID, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid language id: %w", err)
	}
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM resource_languages WHERE resource_id = $1 AND language_id = $2`, rID, lID)
	if err != nil {
		return false, fmt.Errorf("remove resource language: %w", err)
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}
