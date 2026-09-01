package service

import (
	"testing"

	"backend/graph/model"
)

func TestScoreCandidate(t *testing.T) {
	tests := []struct {
		name         string
		resource     []string
		wanted       []string
		wantScore    int
		wantMatching []string
	}{
		{
			name:         "no overlap",
			resource:     []string{"1", "2"},
			wanted:       []string{"3", "4"},
			wantScore:    0,
			wantMatching: []string{},
		},
		{
			name:         "partial overlap keeps wanted order",
			resource:     []string{"4", "1"},
			wanted:       []string{"1", "2", "4"},
			wantScore:    2,
			wantMatching: []string{"1", "4"},
		},
		{
			name:         "nothing wanted scores zero for everyone",
			resource:     []string{"1", "2"},
			wanted:       nil,
			wantScore:    0,
			wantMatching: []string{},
		},
		{
			name:         "resource with no skills",
			resource:     nil,
			wanted:       []string{"1"},
			wantScore:    0,
			wantMatching: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score, matching := scoreCandidate(tt.resource, tt.wanted)
			if score != tt.wantScore {
				t.Errorf("score = %d, want %d", score, tt.wantScore)
			}
			if len(matching) != len(tt.wantMatching) {
				t.Fatalf("matching = %v, want %v", matching, tt.wantMatching)
			}
			for i := range matching {
				if matching[i] != tt.wantMatching[i] {
					t.Errorf("matching[%d] = %q, want %q", i, matching[i], tt.wantMatching[i])
				}
			}
		})
	}
}

func TestUnfilledSkillIDs(t *testing.T) {
	tests := []struct {
		name         string
		requirements []*model.SkillRequirement
		skillIDs     []string
		want         []string
	}{
		{
			name:         "falls back to project skills when no requirements set",
			requirements: nil,
			skillIDs:     []string{"7", "8"},
			want:         []string{"7", "8"},
		},
		{
			name:         "only skills still short",
			requirements: []*model.SkillRequirement{req("1", 2, 2), req("2", 3, 1)},
			skillIDs:     []string{"1", "2"},
			want:         []string{"2"},
		},
		{
			name:         "all requirements met yields nothing wanted",
			requirements: []*model.SkillRequirement{req("1", 1, 1)},
			skillIDs:     []string{"1"},
			want:         []string{},
		},
		{
			name:         "overfilled counts as filled",
			requirements: []*model.SkillRequirement{req("1", 1, 4)},
			skillIDs:     []string{"1"},
			want:         []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := unfilledSkillIDs(tt.requirements, tt.skillIDs)
			if len(got) != len(tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("got[%d] = %q, want %q", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestAvailabilityRankOrdersSoonestFirst(t *testing.T) {
	asap := model.AvailabilityAsap
	one := model.AvailabilityOneWeek
	three := model.AvailabilityThreeWeeks

	if availabilityRank(&asap) >= availabilityRank(&one) {
		t.Error("ASAP should rank before ONE_WEEK")
	}
	if availabilityRank(&one) >= availabilityRank(&three) {
		t.Error("ONE_WEEK should rank before THREE_WEEKS")
	}
	if availabilityRank(nil) <= availabilityRank(&three) {
		t.Error("unknown availability should rank last")
	}
}

func TestMatchFilterAccepts(t *testing.T) {
	asap := model.AvailabilityAsap
	twoWeeks := model.AvailabilityTwoWeeks
	truthy := true
	search := "ann"

	resource := &model.Resource{Name: "Joanna Smith", SkillIds: []string{"1", "2"}, Availability: &asap}

	tests := []struct {
		name         string
		filter       *model.MatchFilter
		projectCount int
		want         bool
	}{
		{name: "nil filter accepts", filter: nil, want: true},
		{name: "onlyFree rejects an already assigned resource", filter: &model.MatchFilter{OnlyFree: &truthy}, projectCount: 1, want: false},
		{name: "onlyFree accepts an unassigned resource", filter: &model.MatchFilter{OnlyFree: &truthy}, projectCount: 0, want: true},
		{name: "search matches case-insensitively on a substring", filter: &model.MatchFilter{Search: &search}, want: true},
		{name: "availability must be one of those requested", filter: &model.MatchFilter{Availability: []model.Availability{twoWeeks}}, want: false},
		{name: "availability match", filter: &model.MatchFilter{Availability: []model.Availability{asap, twoWeeks}}, want: true},
		{name: "skill filter matches any requested skill", filter: &model.MatchFilter{SkillIds: []string{"2", "9"}}, want: true},
		{name: "skill filter rejects when none match", filter: &model.MatchFilter{SkillIds: []string{"9"}}, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := matchFilterAccepts(resource, tt.projectCount, tt.filter); got != tt.want {
				t.Errorf("matchFilterAccepts() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestOpenPositions(t *testing.T) {
	tests := []struct {
		name         string
		requirements []*model.SkillRequirement
		want         int
	}{
		{name: "no requirements", requirements: nil, want: 0},
		{name: "fully staffed", requirements: []*model.SkillRequirement{req("1", 2, 2)}, want: 0},
		{name: "partially staffed", requirements: []*model.SkillRequirement{req("1", 3, 1), req("2", 2, 2)}, want: 2},
		{name: "overfilled does not go negative or offset another gap",
			requirements: []*model.SkillRequirement{req("1", 1, 5), req("2", 3, 0)}, want: 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := openPositions(tt.requirements); got != tt.want {
				t.Errorf("openPositions() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestProjectMatchFilterAccepts(t *testing.T) {
	truthy := false
	search := "apollo"

	project := &model.Project{Name: "Apollo CRM Rebuild", Status: model.ProjectStatusActive}

	tests := []struct {
		name   string
		wanted []string
		filter *model.ProjectMatchFilter
		want   bool
	}{
		{name: "nil filter defaults onlyOpen=true, rejects a fully staffed project", wanted: nil, filter: nil, want: false},
		{name: "nil filter defaults onlyOpen=true, accepts an understaffed project", wanted: []string{"1"}, filter: nil, want: true},
		{name: "onlyOpen explicitly false accepts a fully staffed project",
			wanted: nil, filter: &model.ProjectMatchFilter{OnlyOpen: &truthy}, want: true},
		{name: "search matches case-insensitively on a substring",
			wanted: []string{"1"}, filter: &model.ProjectMatchFilter{Search: &search}, want: true},
		{name: "search rejects a non-matching substring",
			wanted: []string{"1"}, filter: &model.ProjectMatchFilter{Search: strPtrMatch("vega")}, want: false},
		{name: "status filter accepts a listed status",
			wanted: []string{"1"}, filter: &model.ProjectMatchFilter{Status: []model.ProjectStatus{model.ProjectStatusActive}}, want: true},
		{name: "status filter rejects an unlisted status",
			wanted: []string{"1"}, filter: &model.ProjectMatchFilter{Status: []model.ProjectStatus{model.ProjectStatusOnHold}}, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := projectMatchFilterAccepts(project, tt.wanted, tt.filter); got != tt.want {
				t.Errorf("projectMatchFilterAccepts() = %v, want %v", got, tt.want)
			}
		})
	}
}

func strPtrMatch(s string) *string { return &s }
