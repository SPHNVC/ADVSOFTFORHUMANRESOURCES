package model

type ProjectStatus string

const (
	ProjectStatusPlanning  ProjectStatus = "PLANNING"
	ProjectStatusActive    ProjectStatus = "ACTIVE"
	ProjectStatusOnHold    ProjectStatus = "ON_HOLD"
	ProjectStatusCompleted ProjectStatus = "COMPLETED"
)

// AllProjectStatus lists every valid status, for validation and label coverage.
var AllProjectStatus = []ProjectStatus{
	ProjectStatusPlanning,
	ProjectStatusActive,
	ProjectStatusOnHold,
	ProjectStatusCompleted,
}

// SkillRequirement is how many resources a project needs for one skill, and how
// many of those slots are currently filled.
type SkillRequirement struct {
	SkillID   string `json:"skillId"`
	SkillName string `json:"skillName"`
	Needed    int    `json:"needed"`
	Filled    int    `json:"filled"`
}

type Project struct {
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	ContactPerson string              `json:"contactPerson"`
	Phone         *string             `json:"phone"`
	Email         *string             `json:"email"`
	Status        ProjectStatus       `json:"status"`
	SkillIds      []string            `json:"skillIds"`
	Requirements  []*SkillRequirement `json:"requirements"`
	CreatedBy     string              `json:"createdBy"`
	CreatedAt     string              `json:"createdAt"`
	ModifiedBy    string              `json:"modifiedBy"`
	ModifiedAt    string              `json:"modifiedAt"`
}

type CreateProjectInput struct {
	Name          string         `json:"name"`
	ContactPerson string         `json:"contactPerson"`
	Phone         *string        `json:"phone"`
	Email         *string        `json:"email"`
	Status        *ProjectStatus `json:"status"`
}
