package service

import (
	"testing"

	"backend/graph/model"
)

func req(skillID string, needed, filled int) *model.SkillRequirement {
	return &model.SkillRequirement{SkillID: skillID, SkillName: "skill-" + skillID, Needed: needed, Filled: filled}
}

func TestComputeSummary(t *testing.T) {
	tests := []struct {
		name                 string
		staffing             []*model.ProjectStaffing
		totalResources       int
		wantOpen             int
		wantFillRate         float64
		wantFullyStaffed     int
		wantActiveProjects   int
		wantTotalProjectsOut int
	}{
		{
			name:     "no projects at all",
			staffing: nil,
			// A fill rate of 0 rather than NaN is the point of this case.
			wantFillRate: 0,
		},
		{
			name: "project with no requirements is neither short nor fully staffed",
			staffing: []*model.ProjectStaffing{
				{Status: model.ProjectStatusActive, Requirements: nil},
			},
			wantActiveProjects:   1,
			wantTotalProjectsOut: 1,
			wantFillRate:         0,
		},
		{
			name: "partially staffed",
			staffing: []*model.ProjectStaffing{
				{Status: model.ProjectStatusActive, Requirements: []*model.SkillRequirement{
					req("1", 3, 1),
					req("2", 2, 2),
				}},
			},
			wantOpen:             2,
			wantFillRate:         60, // 3 filled of 5 needed
			wantActiveProjects:   1,
			wantTotalProjectsOut: 1,
		},
		{
			name: "fully staffed",
			staffing: []*model.ProjectStaffing{
				{Status: model.ProjectStatusCompleted, Requirements: []*model.SkillRequirement{
					req("1", 2, 2),
				}},
			},
			wantFillRate:         100,
			wantFullyStaffed:     1,
			wantTotalProjectsOut: 1,
		},
		{
			name: "surplus on one skill does not offset a gap on another",
			staffing: []*model.ProjectStaffing{
				{Status: model.ProjectStatusActive, Requirements: []*model.SkillRequirement{
					req("1", 1, 5),
					req("2", 3, 0),
				}},
			},
			wantOpen:             3,
			wantFillRate:         25, // 1 of 4 counted, the 4 extra are ignored
			wantActiveProjects:   1,
			wantTotalProjectsOut: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeSummary(tt.staffing, tt.totalResources)

			if got.OpenPositions != tt.wantOpen {
				t.Errorf("OpenPositions = %d, want %d", got.OpenPositions, tt.wantOpen)
			}
			if got.FillRate != tt.wantFillRate {
				t.Errorf("FillRate = %v, want %v", got.FillRate, tt.wantFillRate)
			}
			if got.FullyStaffedProjects != tt.wantFullyStaffed {
				t.Errorf("FullyStaffedProjects = %d, want %d", got.FullyStaffedProjects, tt.wantFullyStaffed)
			}
			if got.ActiveProjects != tt.wantActiveProjects {
				t.Errorf("ActiveProjects = %d, want %d", got.ActiveProjects, tt.wantActiveProjects)
			}
			if got.TotalProjects != tt.wantTotalProjectsOut {
				t.Errorf("TotalProjects = %d, want %d", got.TotalProjects, tt.wantTotalProjectsOut)
			}
		})
	}
}

// TestProjectStatusValidation guards the Go constant list against drifting from
// the CHECK constraint in migration 000017.
func TestProjectStatusValidation(t *testing.T) {
	for _, s := range model.AllProjectStatus {
		if !validProjectStatus(s) {
			t.Errorf("status %q is in AllProjectStatus but rejected by validProjectStatus", s)
		}
	}
	if validProjectStatus(model.ProjectStatus("NOT_A_STATUS")) {
		t.Error("validProjectStatus accepted an unknown status")
	}
}
