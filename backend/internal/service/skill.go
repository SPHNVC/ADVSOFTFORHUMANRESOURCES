package service

import (
	"context"
	"fmt"
	"strconv"

	"github.com/jmoiron/sqlx"

	"backend/graph/model"
)

type SkillService struct {
	db *sqlx.DB
}

func NewSkillService(db *sqlx.DB) *SkillService {
	return &SkillService{db: db}
}

type skillRow struct {
	ID          int64   `db:"id"`
	Name        string  `db:"name"`
	Description *string `db:"description"`
}

func (r *skillRow) toModel() *model.Skill {
	return &model.Skill{
		ID:          strconv.FormatInt(r.ID, 10),
		Name:        r.Name,
		Description: r.Description,
	}
}

func (s *SkillService) List(ctx context.Context) ([]*model.Skill, error) {
	var rows []skillRow
	if err := s.db.SelectContext(ctx, &rows, `SELECT id, name, description FROM skills ORDER BY name`); err != nil {
		return nil, fmt.Errorf("list skills: %w", err)
	}
	out := make([]*model.Skill, len(rows))
	for i := range rows {
		out[i] = rows[i].toModel()
	}
	return out, nil
}

func (s *SkillService) Create(ctx context.Context, input model.CreateSkillInput) (*model.Skill, error) {
	var row skillRow
	err := s.db.QueryRowxContext(ctx,
		`INSERT INTO skills (name, description) VALUES ($1, $2)
		 RETURNING id, name, description`,
		input.Name, input.Description,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("create skill: %w", err)
	}
	return row.toModel(), nil
}

func (s *SkillService) Delete(ctx context.Context, id string) (bool, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid skill id: %w", err)
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM skills WHERE id = $1`, numID)
	if err != nil {
		return false, fmt.Errorf("delete skill: %w", err)
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}
