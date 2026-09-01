package model

type Comment struct {
	ID     string `json:"id"`
	Author string `json:"author"`
	Text   string `json:"text"`
	At     string `json:"at"`
}

type AddCommentInput struct {
	EntityID string `json:"entityId"`
	Text     string `json:"text"`
}
