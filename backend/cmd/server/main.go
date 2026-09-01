package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"backend/graph"
	"backend/graph/generated"
	internalDB "backend/internal/db"
	authmw "backend/internal/middleware"
	"backend/internal/service"
	"backend/migrations"
)

const devJWTSecret = "dev-secret-change-me"

func main() {
	dsn := getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/crm?sslmode=disable")

	db, err := internalDB.Connect(dsn)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer db.Close()

	if err := runMigrations(db.DB, dsn); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	jwtSecret := getenv("JWT_SECRET", devJWTSecret)
	if jwtSecret == devJWTSecret {
		log.Printf("WARNING: JWT_SECRET not set, using an insecure default. Set JWT_SECRET in production.")
	}

	resolver := &graph.Resolver{
		ProjectSvc:          service.NewProjectService(db),
		SkillSvc:            service.NewSkillService(db),
		ResourceSvc:         service.NewResourceService(db),
		CommentSvc:          service.NewCommentService(db),
		ResourceActivitySvc: service.NewResourceActivityService(db),
		CvSvc:               service.NewCvService(db),
		LanguageSvc:         service.NewLanguageService(db),
		ReportSvc:           service.NewReportService(db),
		MatchSvc:            service.NewMatchService(db),
		AuthSvc:             service.NewAuthService(db, jwtSecret, 24*time.Hour),
	}
	srv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{
		Resolvers:  resolver,
		Directives: generated.DirectiveRoot{Auth: graph.AuthDirective},
	}))

	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.With(authmw.Auth(jwtSecret)).Handle("/graphql", srv)
	r.Handle("/", playground.Handler("CRM GraphQL", "/graphql"))

	port := getenv("PORT", "8080")
	log.Printf("server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

func runMigrations(db *sql.DB, _ string) error {
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("migration source: %w", err)
	}
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("migration driver: %w", err)
	}
	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		return fmt.Errorf("migrate init: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
