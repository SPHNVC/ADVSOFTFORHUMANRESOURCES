package model

type ResourceStatus string

const (
	ResourceStatusFree              ResourceStatus = "FREE"
	ResourceStatusAssignedToProject ResourceStatus = "ASSIGNED_TO_PROJECT"
	ResourceStatusBlacklist         ResourceStatus = "BLACKLIST"
)

type Resource struct {
	ID             string        `json:"id"`
	Name           string        `json:"name"`
	Birthdate      *string       `json:"birthdate"`
	Phone          *string       `json:"phone"`
	Email          *string       `json:"email"`
	Status         ResourceStatus `json:"status"`
	SkillIds       []string       `json:"skillIds"`
	Street         *string        `json:"street"`
	Number         *string        `json:"number"`
	Block          *string        `json:"block"`
	Flat           *string        `json:"flat"`
	ZipCode        *string        `json:"zipCode"`
	City           *string        `json:"city"`
	County         *string        `json:"county"`
	Country        *string        `json:"country"`
	DrivingLicence bool           `json:"drivingLicence"`
	Car            bool           `json:"car"`
	Availability   *Availability  `json:"availability"`
	CreatedBy      string         `json:"createdBy"`
	CreatedAt      string         `json:"createdAt"`
	ModifiedBy     string         `json:"modifiedBy"`
	ModifiedAt     string         `json:"modifiedAt"`
}

type Assignment struct {
	ID            string  `json:"id"`
	ProjectID     string  `json:"projectId"`
	ResourceID    string  `json:"resourceId"`
	ResourceName  string  `json:"resourceName"`
	ResourcePhone *string `json:"resourcePhone"`
	ResourceEmail *string `json:"resourceEmail"`
	SkillID       *string `json:"skillId"`
	AssignedAt    string  `json:"assignedAt"`
}

type CreateResourceInput struct {
	Name           string        `json:"name"`
	Birthdate      *string       `json:"birthdate"`
	Phone          *string       `json:"phone"`
	Email          *string       `json:"email"`
	Street         *string       `json:"street"`
	Number         *string       `json:"number"`
	Block          *string       `json:"block"`
	Flat           *string       `json:"flat"`
	ZipCode        *string       `json:"zipCode"`
	City           *string       `json:"city"`
	County         *string       `json:"county"`
	Country        *string       `json:"country"`
	DrivingLicence *bool         `json:"drivingLicence"`
	Car            *bool         `json:"car"`
	Availability   *Availability `json:"availability"`
}
