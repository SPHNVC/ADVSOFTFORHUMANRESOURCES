package service

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"backend/graph/model"
	"backend/internal/authtoken"
)

type ProjectService struct {
	db *sqlx.DB
}

func NewProjectService(db *sqlx.DB) *ProjectService {
	return &ProjectService{db: db}
}

const projectCols = `id, name, contact_person, phone, email, status, created_by, created_at, modified_by, modified_at`

type projectRow struct {
	ID            int64     `db:"id"`
	Name          string    `db:"name"`
	ContactPerson string    `db:"contact_person"`
	Phone         *string   `db:"phone"`
	Email         *string   `db:"email"`
	Status        string    `db:"status"`
	CreatedBy     string    `db:"created_by"`
	CreatedAt     time.Time `db:"created_at"`
	ModifiedBy    string    `db:"modified_by"`
	ModifiedAt    time.Time `db:"modified_at"`
}

func (r *projectRow) toModel(skillIds []string, requirements []*model.SkillRequirement) *model.Project {
	if skillIds == nil {
		skillIds = []string{}
	}
	if requirements == nil {
		requirements = []*model.SkillRequirement{}
	}
	return &model.Project{
		ID:            strconv.FormatInt(r.ID, 10),
		Name:          r.Name,
		ContactPerson: r.ContactPerson,
		Phone:         r.Phone,
		Email:         r.Email,
		Status:        model.ProjectStatus(r.Status),
		SkillIds:      skillIds,
		Requirements:  requirements,
		CreatedBy:     r.CreatedBy,
		CreatedAt:     r.CreatedAt.UTC().Format("2006-01-02 15:04"),
		ModifiedBy:    r.ModifiedBy,
		ModifiedAt:    r.ModifiedAt.UTC().Format("2006-01-02 15:04"),
	}
}

// validProjectStatus reports whether s is one of the statuses the DB CHECK
// constraint accepts, so a bad value fails as a user error rather than a 500.
func validProjectStatus(s model.ProjectStatus) bool {
	for _, valid := range model.AllProjectStatus {
		if s == valid {
			return true
		}
	}
	return false
}

func (s *ProjectService) List(ctx context.Context) ([]*model.Project, error) {
	var rows []projectRow
	err := s.db.SelectContext(ctx, &rows,
		`SELECT `+projectCols+` FROM projects ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}

	ids := make([]string, len(rows))
	for i, r := range rows {
		ids[i] = strconv.FormatInt(r.ID, 10)
	}
	skillMap, err := s.loadSkillIds(ctx, ids)
	if err != nil {
		return nil, err
	}
	reqMap, err := s.loadRequirements(ctx, ids)
	if err != nil {
		return nil, err
	}

	out := make([]*model.Project, len(rows))
	for i := range rows {
		id := strconv.FormatInt(rows[i].ID, 10)
		out[i] = rows[i].toModel(skillMap[id], reqMap[id])
	}
	return out, nil
}

func (s *ProjectService) Create(ctx context.Context, input model.CreateProjectInput) (*model.Project, error) {
	actor := authtoken.ActorFromContext(ctx)
	status := model.ProjectStatusPlanning
	if input.Status != nil {
		status = *input.Status
	}
	if !validProjectStatus(status) {
		return nil, gqlerror.Errorf("invalid project status %q", status)
	}
	var row projectRow
	err := s.db.QueryRowxContext(ctx,
		`INSERT INTO projects (name, contact_person, phone, email, status, created_by, modified_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $6)
		 RETURNING `+projectCols,
		input.Name, input.ContactPerson, input.Phone, input.Email, string(status), actor,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("create project: %w", err)
	}
	return row.toModel([]string{}, nil), nil
}

func (s *ProjectService) Update(ctx context.Context, id string, input model.UpdateProjectInput) (*model.Project, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}
	if !validProjectStatus(input.Status) {
		return nil, gqlerror.Errorf("invalid project status %q", input.Status)
	}
	actor := authtoken.ActorFromContext(ctx)
	_, err = s.db.ExecContext(ctx,
		`UPDATE projects SET
		   name=$1, contact_person=$2, phone=$3, email=$4, status=$5,
		   modified_by=$6, modified_at=NOW()
		 WHERE id=$7`,
		input.Name, input.ContactPerson, input.Phone, input.Email, string(input.Status), actor, numID,
	)
	if err != nil {
		return nil, fmt.Errorf("update project: %w", err)
	}
	return s.get(ctx, numID)
}

func (s *ProjectService) Delete(ctx context.Context, id string) (bool, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid project id: %w", err)
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM projects WHERE id = $1`, numID)
	if err != nil {
		return false, fmt.Errorf("delete project: %w", err)
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (s *ProjectService) ToggleSkill(ctx context.Context, projectID, skillID string) (*model.Project, error) {
	pID, err := strconv.ParseInt(projectID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}
	sID, err := strconv.ParseInt(skillID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid skill id: %w", err)
	}

	var exists bool
	err = s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM project_skills WHERE project_id=$1 AND skill_id=$2)`,
		pID, sID,
	).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("check project skill: %w", err)
	}

	if exists {
		_, err = s.db.ExecContext(ctx, `DELETE FROM project_skills WHERE project_id=$1 AND skill_id=$2`, pID, sID)
	} else {
		_, err = s.db.ExecContext(ctx, `INSERT INTO project_skills (project_id, skill_id) VALUES ($1, $2)`, pID, sID)
	}
	if err != nil {
		return nil, fmt.Errorf("toggle project skill: %w", err)
	}

	return s.get(ctx, pID)
}

// SetRequirement upserts how many resources the project needs for one skill.
func (s *ProjectService) SetRequirement(ctx context.Context, input model.SetProjectRequirementInput) (*model.Project, error) {
	pID, err := strconv.ParseInt(input.ProjectID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}
	sID, err := strconv.ParseInt(input.SkillID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid skill id: %w", err)
	}
	if input.NeededCount < 1 {
		return nil, gqlerror.Errorf("needed count must be at least 1")
	}
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO project_skill_requirements (project_id, skill_id, needed_count)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (project_id, skill_id) DO UPDATE SET needed_count = EXCLUDED.needed_count`,
		pID, sID, input.NeededCount,
	)
	if err != nil {
		return nil, fmt.Errorf("set project requirement: %w", err)
	}
	return s.get(ctx, pID)
}

func (s *ProjectService) RemoveRequirement(ctx context.Context, projectID, skillID string) (*model.Project, error) {
	pID, err := strconv.ParseInt(projectID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}
	sID, err := strconv.ParseInt(skillID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid skill id: %w", err)
	}
	_, err = s.db.ExecContext(ctx,
		`DELETE FROM project_skill_requirements WHERE project_id=$1 AND skill_id=$2`, pID, sID)
	if err != nil {
		return nil, fmt.Errorf("remove project requirement: %w", err)
	}
	return s.get(ctx, pID)
}

func (s *ProjectService) get(ctx context.Context, id int64) (*model.Project, error) {
	var row projectRow
	if err := s.db.QueryRowxContext(ctx,
		`SELECT `+projectCols+` FROM projects WHERE id=$1`, id,
	).StructScan(&row); err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	strID := strconv.FormatInt(id, 10)
	skillMap, err := s.loadSkillIds(ctx, []string{strID})
	if err != nil {
		return nil, err
	}
	reqMap, err := s.loadRequirements(ctx, []string{strID})
	if err != nil {
		return nil, err
	}
	return row.toModel(skillMap[strID], reqMap[strID]), nil
}

func (s *ProjectService) loadSkillIds(ctx context.Context, ids []string) (map[string][]string, error) {
	if len(ids) == 0 {
		return map[string][]string{}, nil
	}
	type row struct {
		ProjectID int64 `db:"project_id"`
		SkillID   int64 `db:"skill_id"`
	}
	query, args, err := sqlx.In(
		`SELECT project_id, skill_id FROM project_skills WHERE project_id IN (?)`, toInt64s(ids),
	)
	if err != nil {
		return nil, fmt.Errorf("build skill query: %w", err)
	}
	query = s.db.Rebind(query)

	var rows []row
	if err := s.db.SelectContext(ctx, &rows, query, args...); err != nil {
		return nil, fmt.Errorf("load project skills: %w", err)
	}

	m := make(map[string][]string)
	for _, r := range rows {
		k := strconv.FormatInt(r.ProjectID, 10)
		m[k] = append(m[k], strconv.FormatInt(r.SkillID, 10))
	}
	return m, nil
}

// loadRequirements batch-loads per-skill requirements with their filled counts
// for the given projects, keyed by project id.
func (s *ProjectService) loadRequirements(ctx context.Context, ids []string) (map[string][]*model.SkillRequirement, error) {
	if len(ids) == 0 {
		return map[string][]*model.SkillRequirement{}, nil
	}
	type row struct {
		ProjectID   int64  `db:"project_id"`
		SkillID     int64  `db:"skill_id"`
		SkillName   string `db:"skill_name"`
		NeededCount int    `db:"needed_count"`
		Filled      int    `db:"filled"`
	}
	query, args, err := sqlx.In(
		`SELECT r.project_id,
		        r.skill_id,
		        s.name AS skill_name,
		        r.needed_count,
		        COALESCE((
		          SELECT COUNT(*) FROM project_assignments pa
		          WHERE pa.project_id = r.project_id AND pa.skill_id = r.skill_id
		        ), 0) AS filled
		 FROM project_skill_requirements r
		 JOIN skills s ON s.id = r.skill_id
		 WHERE r.project_id IN (?)
		 ORDER BY s.name`, toInt64s(ids),
	)
	if err != nil {
		return nil, fmt.Errorf("build requirements query: %w", err)
	}
	query = s.db.Rebind(query)

	var rows []row
	if err := s.db.SelectContext(ctx, &rows, query, args...); err != nil {
		return nil, fmt.Errorf("load project requirements: %w", err)
	}

	m := make(map[string][]*model.SkillRequirement)
	for _, r := range rows {
		k := strconv.FormatInt(r.ProjectID, 10)
		m[k] = append(m[k], &model.SkillRequirement{
			SkillID:   strconv.FormatInt(r.SkillID, 10),
			SkillName: r.SkillName,
			Needed:    r.NeededCount,
			Filled:    r.Filled,
		})
	}
	return m, nil
}
