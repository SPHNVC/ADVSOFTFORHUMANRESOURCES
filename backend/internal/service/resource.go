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

type ResourceService struct {
	db *sqlx.DB
}

func NewResourceService(db *sqlx.DB) *ResourceService {
	return &ResourceService{db: db}
}

type resourceRow struct {
	ID             int64     `db:"id"`
	Name           string    `db:"name"`
	Birthdate      *string   `db:"birthdate"`
	Phone          *string   `db:"phone"`
	Email          *string   `db:"email"`
	Status         string    `db:"status"`
	Street         *string   `db:"street"`
	Number         *string   `db:"number"`
	Block          *string   `db:"block"`
	Flat           *string   `db:"flat"`
	ZipCode        *string   `db:"zip_code"`
	City           *string   `db:"city"`
	County         *string   `db:"county"`
	Country        *string   `db:"country"`
	DrivingLicence bool      `db:"driving_licence"`
	Car            bool      `db:"car"`
	Availability   *string   `db:"availability"`
	CreatedBy      string    `db:"created_by"`
	CreatedAt      time.Time `db:"created_at"`
	ModifiedBy     string    `db:"modified_by"`
	ModifiedAt     time.Time `db:"modified_at"`
}

const resourceCols = `id, name, birthdate, phone, email, status,
	street, number, block, flat, zip_code, city, county, country,
	driving_licence, car, availability,
	created_by, created_at, modified_by, modified_at`

func (r *resourceRow) toModel(skillIds []string) *model.Resource {
	if skillIds == nil {
		skillIds = []string{}
	}
	var avail *model.Availability
	if r.Availability != nil {
		a := model.Availability(*r.Availability)
		avail = &a
	}
	return &model.Resource{
		ID:             strconv.FormatInt(r.ID, 10),
		Name:           r.Name,
		Birthdate:      r.Birthdate,
		Phone:          r.Phone,
		Email:          r.Email,
		Status:         model.ResourceStatus(r.Status),
		SkillIds:       skillIds,
		Street:         r.Street,
		Number:         r.Number,
		Block:          r.Block,
		Flat:           r.Flat,
		ZipCode:        r.ZipCode,
		City:           r.City,
		County:         r.County,
		Country:        r.Country,
		DrivingLicence: r.DrivingLicence,
		Car:            r.Car,
		Availability:   avail,
		CreatedBy:      r.CreatedBy,
		CreatedAt:      r.CreatedAt.UTC().Format("2006-01-02 15:04"),
		ModifiedBy:     r.ModifiedBy,
		ModifiedAt:     r.ModifiedAt.UTC().Format("2006-01-02 15:04"),
	}
}

type assignmentRow struct {
	ID            int64     `db:"id"`
	ProjectID     int64     `db:"project_id"`
	ResourceID    int64     `db:"resource_id"`
	ResourceName  string    `db:"resource_name"`
	ResourcePhone *string   `db:"resource_phone"`
	ResourceEmail *string   `db:"resource_email"`
	SkillID       *int64    `db:"skill_id"`
	AssignedAt    time.Time `db:"assigned_at"`
}

func (r *assignmentRow) toModel() *model.Assignment {
	var skillID *string
	if r.SkillID != nil {
		s := strconv.FormatInt(*r.SkillID, 10)
		skillID = &s
	}
	return &model.Assignment{
		ID:            strconv.FormatInt(r.ID, 10),
		ProjectID:     strconv.FormatInt(r.ProjectID, 10),
		ResourceID:    strconv.FormatInt(r.ResourceID, 10),
		ResourceName:  r.ResourceName,
		ResourcePhone: r.ResourcePhone,
		ResourceEmail: r.ResourceEmail,
		SkillID:       skillID,
		AssignedAt:    r.AssignedAt.UTC().Format("2006-01-02 15:04"),
	}
}

func (s *ResourceService) List(ctx context.Context) ([]*model.Resource, error) {
	var rows []resourceRow
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT `+resourceCols+` FROM resources ORDER BY created_at DESC`,
	); err != nil {
		return nil, fmt.Errorf("list resources: %w", err)
	}
	skillMap, err := s.loadSkillIds(ctx, extractResourceIDs(rows))
	if err != nil {
		return nil, err
	}
	out := make([]*model.Resource, len(rows))
	for i := range rows {
		id := strconv.FormatInt(rows[i].ID, 10)
		out[i] = rows[i].toModel(skillMap[id])
	}
	return out, nil
}

func (s *ResourceService) GetByID(ctx context.Context, id string) (*model.Resource, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	return s.get(ctx, numID)
}

func (s *ResourceService) Create(ctx context.Context, input model.CreateResourceInput) (*model.Resource, error) {
	actor := authtoken.ActorFromContext(ctx)
	dl := false
	if input.DrivingLicence != nil {
		dl = *input.DrivingLicence
	}
	car := false
	if input.Car != nil {
		car = *input.Car
	}
	var avail *string
	if input.Availability != nil {
		v := string(*input.Availability)
		avail = &v
	}
	var row resourceRow
	err := s.db.QueryRowxContext(ctx,
		`INSERT INTO resources
		   (name, birthdate, phone, email, status,
		    street, number, block, flat, zip_code, city, county, country,
		    driving_licence, car, availability,
		    created_by, modified_by)
		 VALUES ($1,$2,$3,$4,'FREE',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)
		 RETURNING `+resourceCols,
		input.Name, input.Birthdate, input.Phone, input.Email,
		input.Street, input.Number, input.Block, input.Flat,
		input.ZipCode, input.City, input.County, input.Country,
		dl, car, avail, actor,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("create resource: %w", err)
	}
	return row.toModel([]string{}), nil
}

func (s *ResourceService) Update(ctx context.Context, id string, input model.UpdateResourceInput) (*model.Resource, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	var avail *string
	if input.Availability != nil {
		v := string(*input.Availability)
		avail = &v
	}
	actor := authtoken.ActorFromContext(ctx)
	var row resourceRow
	err = s.db.QueryRowxContext(ctx,
		`UPDATE resources SET
		   name=$1, birthdate=$2, phone=$3, email=$4,
		   street=$5, number=$6, block=$7, flat=$8,
		   zip_code=$9, city=$10, county=$11, country=$12,
		   driving_licence=$13, car=$14, availability=$15,
		   modified_by=$16, modified_at=NOW()
		 WHERE id=$17
		 RETURNING `+resourceCols,
		input.Name, input.Birthdate, input.Phone, input.Email,
		input.Street, input.Number, input.Block, input.Flat,
		input.ZipCode, input.City, input.County, input.Country,
		input.DrivingLicence, input.Car, avail, actor, numID,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("update resource: %w", err)
	}
	strID := strconv.FormatInt(numID, 10)
	skillMap, err := s.loadSkillIds(ctx, []string{strID})
	if err != nil {
		return nil, err
	}
	return row.toModel(skillMap[strID]), nil
}

func (s *ResourceService) Delete(ctx context.Context, id string) (bool, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid resource id: %w", err)
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM resources WHERE id = $1`, numID)
	if err != nil {
		return false, fmt.Errorf("delete resource: %w", err)
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (s *ResourceService) Block(ctx context.Context, id string) (*model.Resource, error) {
	numID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin block tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // no-op once committed

	if _, err = tx.ExecContext(ctx,
		`DELETE FROM project_assignments WHERE resource_id = $1`, numID); err != nil {
		return nil, fmt.Errorf("remove assignments on block: %w", err)
	}
	if _, err = tx.ExecContext(ctx,
		`UPDATE resources SET status='BLACKLIST', modified_by=$1, modified_at=NOW() WHERE id=$2`,
		authtoken.ActorFromContext(ctx), numID); err != nil {
		return nil, fmt.Errorf("block resource: %w", err)
	}
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit block: %w", err)
	}
	return s.get(ctx, numID)
}

func (s *ResourceService) ToggleSkill(ctx context.Context, resourceID, skillID string) (*model.Resource, error) {
	rID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	sID, err := strconv.ParseInt(skillID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid skill id: %w", err)
	}
	var exists bool
	if err = s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM resource_skills WHERE resource_id=$1 AND skill_id=$2)`,
		rID, sID,
	).Scan(&exists); err != nil {
		return nil, fmt.Errorf("check resource skill: %w", err)
	}
	if exists {
		_, err = s.db.ExecContext(ctx, `DELETE FROM resource_skills WHERE resource_id=$1 AND skill_id=$2`, rID, sID)
	} else {
		_, err = s.db.ExecContext(ctx, `INSERT INTO resource_skills (resource_id, skill_id) VALUES ($1, $2)`, rID, sID)
	}
	if err != nil {
		return nil, fmt.Errorf("toggle resource skill: %w", err)
	}
	return s.get(ctx, rID)
}

func (s *ResourceService) ListAssignments(ctx context.Context, projectID string) ([]*model.Assignment, error) {
	pID, err := strconv.ParseInt(projectID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}
	var rows []assignmentRow
	if err = s.db.SelectContext(ctx, &rows,
		`SELECT pa.id, pa.project_id, pa.resource_id, r.name AS resource_name,
		        r.phone AS resource_phone, r.email AS resource_email,
		        pa.skill_id, pa.assigned_at
		 FROM project_assignments pa
		 JOIN resources r ON r.id = pa.resource_id
		 WHERE pa.project_id = $1
		 ORDER BY pa.assigned_at`, pID,
	); err != nil {
		return nil, fmt.Errorf("list assignments: %w", err)
	}
	out := make([]*model.Assignment, len(rows))
	for i := range rows {
		out[i] = rows[i].toModel()
	}
	return out, nil
}

// Assign links a resource to a project, optionally tagging which skill
// requirement the assignment fills. The assignment row and the denormalized
// resources.status are written in one transaction so the two cannot diverge.
func (s *ResourceService) Assign(ctx context.Context, projectID, resourceID string, skillID *string) (*model.Assignment, error) {
	pID, err := strconv.ParseInt(projectID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}
	rID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	var sID *int64
	if skillID != nil && *skillID != "" {
		parsed, err := strconv.ParseInt(*skillID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid skill id: %w", err)
		}
		sID = &parsed
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin assign tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // no-op once committed

	var current string
	if err = tx.QueryRowContext(ctx, `SELECT status FROM resources WHERE id=$1`, rID).Scan(&current); err != nil {
		return nil, fmt.Errorf("load resource status: %w", err)
	}
	if current == string(model.ResourceStatusBlacklist) {
		return nil, gqlerror.Errorf("cannot assign a blacklisted resource")
	}

	var row assignmentRow
	err = tx.QueryRowxContext(ctx,
		`INSERT INTO project_assignments (project_id, resource_id, skill_id)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (project_id, resource_id)
		 DO UPDATE SET assigned_at = NOW(), skill_id = EXCLUDED.skill_id
		 RETURNING id, project_id, resource_id, skill_id, assigned_at`,
		pID, rID, sID,
	).StructScan(&row)
	if err != nil {
		return nil, fmt.Errorf("assign resource: %w", err)
	}

	var res resourceRow
	if err = tx.QueryRowxContext(ctx,
		`UPDATE resources SET status='ASSIGNED_TO_PROJECT', modified_by=$1, modified_at=NOW()
		 WHERE id=$2
		 RETURNING `+resourceCols,
		authtoken.ActorFromContext(ctx), rID,
	).StructScan(&res); err != nil {
		return nil, fmt.Errorf("set assigned status: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit assign: %w", err)
	}

	row.ResourceName = res.Name
	row.ResourcePhone = res.Phone
	row.ResourceEmail = res.Email
	return row.toModel(), nil
}

func (s *ResourceService) Unassign(ctx context.Context, projectID, resourceID string) (bool, error) {
	pID, err := strconv.ParseInt(projectID, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid project id: %w", err)
	}
	rID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return false, fmt.Errorf("invalid resource id: %w", err)
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return false, fmt.Errorf("begin unassign tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck // no-op once committed

	res, err := tx.ExecContext(ctx,
		`DELETE FROM project_assignments WHERE project_id=$1 AND resource_id=$2`, pID, rID)
	if err != nil {
		return false, fmt.Errorf("unassign resource: %w", err)
	}
	n, _ := res.RowsAffected()
	if n > 0 {
		// status is a denormalization of "has at least one assignment", so it
		// only returns to FREE once none remain (and never overrides BLACKLIST).
		var remaining int
		if err = tx.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM project_assignments WHERE resource_id=$1`, rID,
		).Scan(&remaining); err != nil {
			return false, fmt.Errorf("count remaining assignments: %w", err)
		}
		if remaining == 0 {
			_, err = tx.ExecContext(ctx,
				`UPDATE resources SET status='FREE', modified_by=$1, modified_at=NOW()
				 WHERE id=$2 AND status <> 'BLACKLIST'`, authtoken.ActorFromContext(ctx), rID)
			if err != nil {
				return false, fmt.Errorf("reset status to free: %w", err)
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return false, fmt.Errorf("commit unassign: %w", err)
	}
	return n > 0, nil
}

// ListAllocations reports, for every resource, which projects it is currently
// assigned to — the inverse of ListAssignments.
func (s *ResourceService) ListAllocations(ctx context.Context) ([]*model.ResourceAllocation, error) {
	resources, err := s.List(ctx)
	if err != nil {
		return nil, err
	}

	type row struct {
		ResourceID  int64  `db:"resource_id"`
		ProjectName string `db:"project_name"`
	}
	var rows []row
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT pa.resource_id, p.name AS project_name
		 FROM project_assignments pa
		 JOIN projects p ON p.id = pa.project_id
		 ORDER BY p.name`,
	); err != nil {
		return nil, fmt.Errorf("load resource allocations: %w", err)
	}

	byResource := make(map[string][]string, len(rows))
	for _, r := range rows {
		k := strconv.FormatInt(r.ResourceID, 10)
		byResource[k] = append(byResource[k], r.ProjectName)
	}

	out := make([]*model.ResourceAllocation, len(resources))
	for i, res := range resources {
		names := byResource[res.ID]
		if names == nil {
			names = []string{}
		}
		out[i] = &model.ResourceAllocation{
			Resource:     res,
			ProjectCount: len(names),
			ProjectNames: names,
		}
	}
	return out, nil
}

func (s *ResourceService) get(ctx context.Context, id int64) (*model.Resource, error) {
	var row resourceRow
	if err := s.db.QueryRowxContext(ctx,
		`SELECT `+resourceCols+` FROM resources WHERE id=$1`, id,
	).StructScan(&row); err != nil {
		return nil, fmt.Errorf("get resource: %w", err)
	}
	strID := strconv.FormatInt(id, 10)
	skillMap, err := s.loadSkillIds(ctx, []string{strID})
	if err != nil {
		return nil, err
	}
	return row.toModel(skillMap[strID]), nil
}

func (s *ResourceService) loadSkillIds(ctx context.Context, ids []string) (map[string][]string, error) {
	if len(ids) == 0 {
		return map[string][]string{}, nil
	}
	type row struct {
		ResourceID int64 `db:"resource_id"`
		SkillID    int64 `db:"skill_id"`
	}
	query, args, err := sqlx.In(
		`SELECT resource_id, skill_id FROM resource_skills WHERE resource_id IN (?)`, toInt64s(ids),
	)
	if err != nil {
		return nil, fmt.Errorf("build skill query: %w", err)
	}
	query = s.db.Rebind(query)
	var rows []row
	if err := s.db.SelectContext(ctx, &rows, query, args...); err != nil {
		return nil, fmt.Errorf("load resource skills: %w", err)
	}
	m := make(map[string][]string)
	for _, r := range rows {
		k := strconv.FormatInt(r.ResourceID, 10)
		m[k] = append(m[k], strconv.FormatInt(r.SkillID, 10))
	}
	return m, nil
}

func extractResourceIDs(rows []resourceRow) []string {
	ids := make([]string, len(rows))
	for i, r := range rows {
		ids[i] = strconv.FormatInt(r.ID, 10)
	}
	return ids
}

func toInt64s(ids []string) []int64 {
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if n, err := strconv.ParseInt(id, 10, 64); err == nil {
			out = append(out, n)
		}
	}
	return out
}
