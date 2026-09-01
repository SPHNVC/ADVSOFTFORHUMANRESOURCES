package service

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/jmoiron/sqlx"

	"backend/graph/model"
)

// MatchService ranks resources as candidates for a project's open skill slots.
type MatchService struct {
	db *sqlx.DB
}

func NewMatchService(db *sqlx.DB) *MatchService {
	return &MatchService{db: db}
}

// availabilityRank orders availability best-first, so sooner beats later when
// two candidates cover the same number of skills. Resources with no stated
// availability sort last.
func availabilityRank(a *model.Availability) int {
	if a == nil {
		return 99
	}
	switch *a {
	case model.AvailabilityAsap:
		return 0
	case model.AvailabilityOneWeek:
		return 1
	case model.AvailabilityTwoWeeks:
		return 2
	case model.AvailabilityThreeWeeks:
		return 3
	default:
		return 98
	}
}

// scoreCandidate counts how many of the wanted skills a resource covers, and
// returns those overlapping skill ids in the order they were wanted. When
// nothing is wanted every candidate scores 0 and ranking falls back to
// availability, which keeps an unconfigured project from showing an empty list.
func scoreCandidate(resourceSkillIDs, wantedSkillIDs []string) (int, []string) {
	have := make(map[string]bool, len(resourceSkillIDs))
	for _, id := range resourceSkillIDs {
		have[id] = true
	}
	matching := make([]string, 0, len(wantedSkillIDs))
	for _, want := range wantedSkillIDs {
		if have[want] {
			matching = append(matching, want)
		}
	}
	return len(matching), matching
}

// unfilledSkillIDs returns the skills a project still needs people for, falling
// back to its tagged skills when no per-skill requirements have been set.
func unfilledSkillIDs(requirements []*model.SkillRequirement, skillIDs []string) []string {
	out := make([]string, 0, len(requirements))
	for _, r := range requirements {
		if r.Filled < r.Needed {
			out = append(out, r.SkillID)
		}
	}
	if len(requirements) == 0 {
		return skillIDs
	}
	return out
}

// matchFilterAccepts applies the caller's manual filters to a candidate.
func matchFilterAccepts(r *model.Resource, projectCount int, filter *model.MatchFilter) bool {
	if filter == nil {
		return true
	}
	if filter.OnlyFree != nil && *filter.OnlyFree && projectCount > 0 {
		return false
	}
	if filter.Search != nil && strings.TrimSpace(*filter.Search) != "" {
		if !strings.Contains(strings.ToLower(r.Name), strings.ToLower(strings.TrimSpace(*filter.Search))) {
			return false
		}
	}
	if len(filter.Availability) > 0 {
		if r.Availability == nil {
			return false
		}
		found := false
		for _, a := range filter.Availability {
			if a == *r.Availability {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	if len(filter.SkillIds) > 0 {
		have := make(map[string]bool, len(r.SkillIds))
		for _, id := range r.SkillIds {
			have[id] = true
		}
		found := false
		for _, want := range filter.SkillIds {
			if have[want] {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// Match returns candidate resources for a project, ranked by how many of the
// project's still-unfilled skills they cover, then by availability, then name.
// Blacklisted resources and people already on the project are excluded.
func (s *MatchService) Match(
	ctx context.Context,
	projectSvc *ProjectService,
	resourceSvc *ResourceService,
	projectID string,
	filter *model.MatchFilter,
) ([]*model.ResourceMatch, error) {
	pID, err := strconv.ParseInt(projectID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid project id: %w", err)
	}

	project, err := projectSvc.get(ctx, pID)
	if err != nil {
		return nil, err
	}
	wanted := unfilledSkillIDs(project.Requirements, project.SkillIds)

	resources, err := resourceSvc.List(ctx)
	if err != nil {
		return nil, err
	}

	alreadyOnProject, err := s.resourceIDsOnProject(ctx, pID)
	if err != nil {
		return nil, err
	}
	projectCounts, err := s.assignmentCounts(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]*model.ResourceMatch, 0, len(resources))
	for _, r := range resources {
		if r.Status == model.ResourceStatusBlacklist || alreadyOnProject[r.ID] {
			continue
		}
		count := projectCounts[r.ID]
		if !matchFilterAccepts(r, count, filter) {
			continue
		}
		score, matching := scoreCandidate(r.SkillIds, wanted)
		out = append(out, &model.ResourceMatch{
			Resource:             r,
			MatchScore:           score,
			MatchingSkillIds:     matching,
			AssignedProjectCount: count,
		})
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].MatchScore != out[j].MatchScore {
			return out[i].MatchScore > out[j].MatchScore
		}
		ri, rj := availabilityRank(out[i].Resource.Availability), availabilityRank(out[j].Resource.Availability)
		if ri != rj {
			return ri < rj
		}
		return out[i].Resource.Name < out[j].Resource.Name
	})
	return out, nil
}

// openPositions sums how many skill slots across all of a project's
// requirements are still unfilled. A skill overfilled beyond its needed
// count never offsets a gap elsewhere, mirroring computeSummary in report.go.
func openPositions(requirements []*model.SkillRequirement) int {
	open := 0
	for _, r := range requirements {
		filled := r.Filled
		if filled > r.Needed {
			filled = r.Needed
		}
		open += r.Needed - filled
	}
	return open
}

// projectMatchFilterAccepts applies the caller's manual filters to a
// candidate project. onlyOpen defaults to true (nil filter, or nil
// filter.OnlyOpen) since this matcher exists specifically to find projects
// that still need staffing.
func projectMatchFilterAccepts(p *model.Project, wanted []string, filter *model.ProjectMatchFilter) bool {
	onlyOpen := true
	if filter != nil && filter.OnlyOpen != nil {
		onlyOpen = *filter.OnlyOpen
	}
	if onlyOpen && len(wanted) == 0 {
		return false
	}
	if filter == nil {
		return true
	}
	if filter.Search != nil && strings.TrimSpace(*filter.Search) != "" {
		if !strings.Contains(strings.ToLower(p.Name), strings.ToLower(strings.TrimSpace(*filter.Search))) {
			return false
		}
	}
	if len(filter.Status) > 0 {
		found := false
		for _, s := range filter.Status {
			if s == p.Status {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// MatchProjects returns candidate projects for a resource, ranked by how many
// of each project's still-unfilled skills the resource covers — the inverse
// of Match. Completed projects and ones the resource is already on are
// excluded; a blacklisted resource matches nothing, consistent with Assign
// refusing to place one.
func (s *MatchService) MatchProjects(
	ctx context.Context,
	projectSvc *ProjectService,
	resourceSvc *ResourceService,
	resourceID string,
	filter *model.ProjectMatchFilter,
) ([]*model.ProjectMatch, error) {
	resource, err := resourceSvc.GetByID(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	if resource.Status == model.ResourceStatusBlacklist {
		return []*model.ProjectMatch{}, nil
	}

	alreadyOn, err := s.projectIDsForResource(ctx, resourceID)
	if err != nil {
		return nil, err
	}

	projects, err := projectSvc.List(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]*model.ProjectMatch, 0, len(projects))
	for _, p := range projects {
		if p.Status == model.ProjectStatusCompleted || alreadyOn[p.ID] {
			continue
		}
		wanted := unfilledSkillIDs(p.Requirements, p.SkillIds)
		if !projectMatchFilterAccepts(p, wanted, filter) {
			continue
		}
		score, matching := scoreCandidate(resource.SkillIds, wanted)
		out = append(out, &model.ProjectMatch{
			Project:          p,
			MatchScore:       score,
			MatchingSkillIds: matching,
			OpenPositions:    openPositions(p.Requirements),
		})
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].MatchScore != out[j].MatchScore {
			return out[i].MatchScore > out[j].MatchScore
		}
		if out[i].OpenPositions != out[j].OpenPositions {
			return out[i].OpenPositions > out[j].OpenPositions
		}
		return out[i].Project.Name < out[j].Project.Name
	})
	return out, nil
}

func (s *MatchService) projectIDsForResource(ctx context.Context, resourceID string) (map[string]bool, error) {
	rID, err := strconv.ParseInt(resourceID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid resource id: %w", err)
	}
	var ids []int64
	if err := s.db.SelectContext(ctx, &ids,
		`SELECT project_id FROM project_assignments WHERE resource_id=$1`, rID); err != nil {
		return nil, fmt.Errorf("load resource assignments: %w", err)
	}
	m := make(map[string]bool, len(ids))
	for _, id := range ids {
		m[strconv.FormatInt(id, 10)] = true
	}
	return m, nil
}

func (s *MatchService) resourceIDsOnProject(ctx context.Context, projectID int64) (map[string]bool, error) {
	var ids []int64
	if err := s.db.SelectContext(ctx, &ids,
		`SELECT resource_id FROM project_assignments WHERE project_id=$1`, projectID); err != nil {
		return nil, fmt.Errorf("load project assignments: %w", err)
	}
	m := make(map[string]bool, len(ids))
	for _, id := range ids {
		m[strconv.FormatInt(id, 10)] = true
	}
	return m, nil
}

func (s *MatchService) assignmentCounts(ctx context.Context) (map[string]int, error) {
	type row struct {
		ResourceID int64 `db:"resource_id"`
		Count      int   `db:"count"`
	}
	var rows []row
	if err := s.db.SelectContext(ctx, &rows,
		`SELECT resource_id, COUNT(*) AS count FROM project_assignments GROUP BY resource_id`); err != nil {
		return nil, fmt.Errorf("count assignments: %w", err)
	}
	m := make(map[string]int, len(rows))
	for _, r := range rows {
		m[strconv.FormatInt(r.ResourceID, 10)] = r.Count
	}
	return m, nil
}
