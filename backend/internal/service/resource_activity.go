package service

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"backend/graph/model"
)

const activityDateLayout = "2006-01"

type ResourceActivityService struct {
	db *sqlx.DB
}

func NewResourceActivityService(db *sqlx.DB) *ResourceActivityService {
	return &ResourceActivityService{db: db}
}

type resourceActivityRow struct {
	ID          int64     `db:"id"`
	ResourceID  int64     `db:"resource_id"`
	Name        string    `db:"name"`
	Description *string   `db:"description"`
	StartDate   time.Time `db:"start_date"`
	EndDate     time.Time `db:"end_date"`
}

const resourceActivityCols = `id, resource_id, name, description, start_date, end_date`

func (r *resourceActivityRow) toModel() *model.ResourceActivity {
	return &model.ResourceActivity{
		ID:          strconv.FormatInt(r.ID, 10),
		ResourceID:  strconv.FormatInt(r.ResourceID, 10),
		Name:        r.Name,
		Description: r.Description,
		StartDate:   r.StartDate.Format(activityDateLayout),
		EndDate:     r.EndDate.Format(activityDateLayout),
	}
}

func (s *ResourceActivityService) ListByResource(ctx context.Context, resourceID string) ([]*model.ResourceActivity, error) {
	rID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	var rows []resourceActivityRow
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT `+resourceActivityCols+` FROM resource_activities WHERE resource_id=$1 ORDER BY start_date, id`,
		rID,
	); err != nil {
		return nil, fmt.Errorf("list resource activities: %w", err)
	}
	out := make([]*model.ResourceActivity, len(rows))
	for i := range rows {
		out[i] = rows[i].toModel()
	}
	return out, nil
}

func (s *ResourceActivityService) Create(ctx context.Context, input model.CreateResourceActivityInput) (*model.ResourceActivity, error) {
	rID, err := strconv.ParseInt(input.ResourceID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	start, end, err := parseActivityDates(input.StartDate, input.EndDate)
	if err != nil {
		return nil, err
	}
	var row resourceActivityRow
	err = s.db.QueryRowxContext(ctx,
		`INSERT INTO resource_activities (resource_id, name, description, start_date, end_date)
		 VALUES ($1,$2,$3,$4,$5)
		 RETURNING `+resourceActivityCols,
		rID, input.Name, input.Description, start, end,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("create resource activity: %w", err)
	}
	return row.toModel(), nil
}

func (s *ResourceActivityService) Update(ctx context.Context, id string, input model.UpdateResourceActivityInput) (*model.ResourceActivity, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource activity id: %w", err)
	}
	start, end, err := parseActivityDates(input.StartDate, input.EndDate)
	if err != nil {
		return nil, err
	}
	var row resourceActivityRow
	err = s.db.QueryRowxContext(ctx,
		`UPDATE resource_activities SET
		   name=$1, description=$2, start_date=$3, end_date=$4, modified_at=NOW()
		 WHERE id=$5
		 RETURNING `+resourceActivityCols,
		input.Name, input.Description, start, end, numID,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("update resource activity: %w", err)
	}
	return row.toModel(), nil
}

func (s *ResourceActivityService) Delete(ctx context.Context, id string) (bool, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid resource activity id: %w", err)
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM resource_activities WHERE id = $1`, numID)
	if err != nil {
		return false, fmt.Errorf("delete resource activity: %w", err)
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func parseActivityDates(startStr, endStr string) (time.Time, time.Time, error) {
	start, err := time.Parse(activityDateLayout, startStr)
	if err != nil {
		return time.Time{}, time.Time{}, gqlerror.Errorf("invalid start date, expected mm:yyyy")
	}
	end, err := time.Parse(activityDateLayout, endStr)
	if err != nil {
		return time.Time{}, time.Time{}, gqlerror.Errorf("invalid end date, expected mm:yyyy")
	}
	if end.Before(start) {
		return time.Time{}, time.Time{}, gqlerror.Errorf("end date must not be before start date")
	}
	return start, end, nil
}
