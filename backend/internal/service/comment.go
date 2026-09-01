package service

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"

	"backend/graph/model"
	"backend/internal/authtoken"
)

type CommentService struct {
	db *sqlx.DB
}

func NewCommentService(db *sqlx.DB) *CommentService {
	return &CommentService{db: db}
}

type commentRow struct {
	ID     int64     `db:"id"`
	Author string    `db:"author"`
	Text   string    `db:"text"`
	At     time.Time `db:"at"`
}

func (r *commentRow) toModel() *model.Comment {
	return &model.Comment{
		ID:     strconv.FormatInt(r.ID, 10),
		Author: r.Author,
		Text:   r.Text,
		At:     r.At.UTC().Format("2006-01-02 15:04"),
	}
}

func (s *CommentService) ListForProject(ctx context.Context, projectID string) ([]*model.Comment, error) {
	pID, err := strconv.ParseInt(projectID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}
	var rows []commentRow
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT id, author, text, at FROM project_comments WHERE project_id=$1 ORDER BY at`, pID,
	); err != nil {
		return nil, fmt.Errorf("list project comments: %w", err)
	}
	return toCommentModels(rows), nil
}

func (s *CommentService) ListForResource(ctx context.Context, resourceID string) ([]*model.Comment, error) {
	rID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	var rows []commentRow
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT id, author, text, at FROM resource_comments WHERE resource_id=$1 ORDER BY at`, rID,
	); err != nil {
		return nil, fmt.Errorf("list resource comments: %w", err)
	}
	return toCommentModels(rows), nil
}

func (s *CommentService) AddToProject(ctx context.Context, input model.AddCommentInput) (*model.Comment, error) {
	pID, err := strconv.ParseInt(input.EntityID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}
	actor := authtoken.ActorFromContext(ctx)
	var row commentRow
	err = s.db.QueryRowxContext(ctx,
		`INSERT INTO project_comments (project_id, author, text)
		 VALUES ($1, $2, $3)
		 RETURNING id, author, text, at`,
		pID, actor, input.Text,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("add project comment: %w", err)
	}
	// touch project modified_at
	_, _ = s.db.ExecContext(ctx,
		`UPDATE projects SET modified_by=$1, modified_at=NOW() WHERE id=$2`, actor, pID)
	return row.toModel(), nil
}

func (s *CommentService) AddToResource(ctx context.Context, input model.AddCommentInput) (*model.Comment, error) {
	rID, err := strconv.ParseInt(input.EntityID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	actor := authtoken.ActorFromContext(ctx)
	var row commentRow
	err = s.db.QueryRowxContext(ctx,
		`INSERT INTO resource_comments (resource_id, author, text)
		 VALUES ($1, $2, $3)
		 RETURNING id, author, text, at`,
		rID, actor, input.Text,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("add resource comment: %w", err)
	}
	_, _ = s.db.ExecContext(ctx,
		`UPDATE resources SET modified_by=$1, modified_at=NOW() WHERE id=$2`, actor, rID)
	return row.toModel(), nil
}

func toCommentModels(rows []commentRow) []*model.Comment {
	out := make([]*model.Comment, len(rows))
	for i := range rows {
		out[i] = rows[i].toModel()
	}
	return out
}
