package service

import (
	"context"
	"fmt"
	"strconv"

	"github.com/jmoiron/sqlx"

	"backend/graph/model"
)

// ReportService assembles the aggregate figures behind the reports dashboard.
type ReportService struct {
	db *sqlx.DB
}

func NewReportService(db *sqlx.DB) *ReportService {
	return &ReportService{db: db}
}

// computeSummary derives the headline KPIs from per-project staffing. Kept free
// of the database so the arithmetic — especially the empty and zero-requirement
// cases — is directly testable.
func computeSummary(staffing []*model.ProjectStaffing, totalResources int) *model.ReportSummary {
	summary := &model.ReportSummary{
		TotalProjects:  len(staffing),
		TotalResources: totalResources,
	}

	totalNeeded, totalFilled := 0, 0
	for _, p := range staffing {
		if p.Status == model.ProjectStatusActive {
			summary.ActiveProjects++
		}

		projectNeeded, projectFilled, fullyStaffed := 0, 0, true
		for _, r := range p.Requirements {
			projectNeeded += r.Needed
			// Cap at needed: extra people on one skill never offset a gap elsewhere.
			filled := r.Filled
			if filled > r.Needed {
				filled = r.Needed
			}
			projectFilled += filled
			if r.Filled < r.Needed {
				fullyStaffed = false
			}
		}

		totalNeeded += projectNeeded
		totalFilled += projectFilled
		summary.OpenPositions += projectNeeded - projectFilled

		// A project with no requirements set has nothing to be short of, but it
		// is not evidence of being fully staffed either.
		if fullyStaffed && len(p.Requirements) > 0 {
			summary.FullyStaffedProjects++
		}
	}

	if totalNeeded > 0 {
		summary.FillRate = float64(totalFilled) / float64(totalNeeded) * 100
	}
	return summary
}

func (s *ReportService) Build(ctx context.Context, projectSvc *ProjectService) (*model.Reports, error) {
	staffing, err := s.projectStaffing(ctx, projectSvc)
	if err != nil {
		return nil, err
	}
	skillDemand, err := s.skillDemand(ctx)
	if err != nil {
		return nil, err
	}
	allocation, totalResources, err := s.allocation(ctx)
	if err != nil {
		return nil, err
	}
	return &model.Reports{
		Summary:         computeSummary(staffing, totalResources),
		ProjectStaffing: staffing,
		SkillDemand:     skillDemand,
		Allocation:      allocation,
	}, nil
}

func (s *ReportService) projectStaffing(ctx context.Context, projectSvc *ProjectService) ([]*model.ProjectStaffing, error) {
	projects, err := projectSvc.List(ctx)
	if err != nil {
		return nil, err
	}

	type row struct {
		ProjectID int64 `db:"project_id"`
		Count     int   `db:"count"`
	}
	var rows []row
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT project_id, COUNT(DISTINCT resource_id) AS count
		 FROM project_assignments GROUP BY project_id`); err != nil {
		return nil, fmt.Errorf("count project assignments: %w", err)
	}
	assigned := make(map[string]int, len(rows))
	for _, r := range rows {
		assigned[strconv.FormatInt(r.ProjectID, 10)] = r.Count
	}

	out := make([]*model.ProjectStaffing, len(projects))
	for i, p := range projects {
		totalNeeded := 0
		for _, r := range p.Requirements {
			totalNeeded += r.Needed
		}
		out[i] = &model.ProjectStaffing{
			ProjectID:     p.ID,
			ProjectName:   p.Name,
			Status:        p.Status,
			TotalNeeded:   totalNeeded,
			TotalAssigned: assigned[p.ID],
			Requirements:  p.Requirements,
		}
	}
	return out, nil
}

// skillDemand compares how many people each skill is requested for against how
// many non-blacklisted resources actually have it.
func (s *ReportService) skillDemand(ctx context.Context) ([]*model.SkillDemand, error) {
	type row struct {
		SkillID        int64  `db:"skill_id"`
		SkillName      string `db:"skill_name"`
		Demand         int    `db:"demand"`
		Supply         int    `db:"supply"`
		AssignedSupply int    `db:"assigned_supply"`
	}
	var rows []row
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT s.id AS skill_id,
		        s.name AS skill_name,
		        COALESCE((
		          SELECT SUM(r.needed_count) FROM project_skill_requirements r
		          WHERE r.skill_id = s.id
		        ), 0) AS demand,
		        COALESCE((
		          SELECT COUNT(*) FROM resource_skills rs
		          JOIN resources res ON res.id = rs.resource_id
		          WHERE rs.skill_id = s.id AND res.status <> 'BLACKLIST'
		        ), 0) AS supply,
		        COALESCE((
		          SELECT COUNT(DISTINCT rs.resource_id) FROM resource_skills rs
		          JOIN resources res ON res.id = rs.resource_id
		          JOIN project_assignments pa ON pa.resource_id = rs.resource_id
		          WHERE rs.skill_id = s.id AND res.status <> 'BLACKLIST'
		        ), 0) AS assigned_supply
		 FROM skills s
		 ORDER BY s.name`); err != nil {
		return nil, fmt.Errorf("load skill demand: %w", err)
	}

	out := make([]*model.SkillDemand, len(rows))
	for i, r := range rows {
		out[i] = &model.SkillDemand{
			SkillID:        strconv.FormatInt(r.SkillID, 10),
			SkillName:      r.SkillName,
			Demand:         r.Demand,
			Supply:         r.Supply,
			AssignedSupply: r.AssignedSupply,
		}
	}
	return out, nil
}

// allocation splits the resource pool. Assigned is counted from actual
// assignment rows rather than resources.status, both because status is a
// denormalization and because the DB enum still carries two dead labels
// (IN_PROCESS, ASSIGNED) that the GraphQL enum does not expose.
func (s *ReportService) allocation(ctx context.Context) (*model.AllocationSummary, int, error) {
	var total, blacklisted, assigned int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM resources`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count resources: %w", err)
	}
	if err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM resources WHERE status = 'BLACKLIST'`).Scan(&blacklisted); err != nil {
		return nil, 0, fmt.Errorf("count blacklisted: %w", err)
	}
	if err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT pa.resource_id)
		 FROM project_assignments pa
		 JOIN resources r ON r.id = pa.resource_id
		 WHERE r.status <> 'BLACKLIST'`).Scan(&assigned); err != nil {
		return nil, 0, fmt.Errorf("count assigned: %w", err)
	}

	free := total - blacklisted - assigned
	if free < 0 {
		free = 0
	}

	type row struct {
		Availability *string `db:"availability"`
		Count        int     `db:"count"`
	}
	var rows []row
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT availability, COUNT(*) AS count
		 FROM resources
		 WHERE status <> 'BLACKLIST'
		 GROUP BY availability
		 ORDER BY availability`); err != nil {
		return nil, 0, fmt.Errorf("group by availability: %w", err)
	}

	buckets := make([]*model.AvailabilityBucket, 0, len(rows))
	for _, r := range rows {
		b := &model.AvailabilityBucket{Count: r.Count}
		if r.Availability != nil {
			a := model.Availability(*r.Availability)
			if a.IsValid() {
				b.Availability = &a
			}
		}
		buckets = append(buckets, b)
	}

	return &model.AllocationSummary{
		Free:           free,
		Assigned:       assigned,
		Blacklisted:    blacklisted,
		ByAvailability: buckets,
	}, total, nil
}
