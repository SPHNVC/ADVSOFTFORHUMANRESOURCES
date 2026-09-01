// Package middleware holds HTTP-level middleware for the chi router.
package middleware

import (
	"net/http"
	"strings"

	"backend/internal/authtoken"
)

// Auth reads a Bearer token if present and attaches the user it resolves to
// onto the request context. A missing or invalid token is not rejected here
// — that would also block the unauthenticated login mutation, which shares
// this same /graphql endpoint. Per-field enforcement is the @auth directive's
// job (see graph/directives.go); this middleware only ever populates context.
func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			token, ok := strings.CutPrefix(header, "Bearer ")
			if ok && token != "" {
				if user, err := authtoken.ParseToken(secret, token); err == nil {
					r = r.WithContext(authtoken.WithUser(r.Context(), user))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
