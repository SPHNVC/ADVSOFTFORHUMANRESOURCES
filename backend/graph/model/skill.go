package model

type Skill struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type CreateSkillInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}
