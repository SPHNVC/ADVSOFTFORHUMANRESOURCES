package graph

import "backend/internal/service"

type Resolver struct {
	ProjectSvc          *service.ProjectService
	SkillSvc            *service.SkillService
	ResourceSvc         *service.ResourceService
	CommentSvc          *service.CommentService
	ResourceActivitySvc *service.ResourceActivityService
	CvSvc               *service.CvService
	LanguageSvc         *service.LanguageService
	ReportSvc           *service.ReportService
	MatchSvc            *service.MatchService
	AuthSvc             *service.AuthService
}
