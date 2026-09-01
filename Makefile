BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: backend frontend generate tidy

backend:
	cd $(BACKEND_DIR) && go run ./cmd/server

frontend:
	cd $(FRONTEND_DIR) && npm run dev

generate:
	cd $(BACKEND_DIR) && go run github.com/99designs/gqlgen generate

tidy:
	cd $(BACKEND_DIR) && go mod tidy
