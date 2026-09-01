package graph

import (
	"context"

	"github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2/gqlerror"

	"backend/internal/authtoken"
)

// AuthDirective backs the @auth schema directive: it rejects any field it
// guards unless the auth middleware (internal/middleware/auth.go) already
// verified a JWT and attached a user to the request context. The login
// mutation is the only field in the schema without @auth, which is what
// makes it reachable before a token exists.
func AuthDirective(ctx context.Context, obj interface{}, next graphql.Resolver) (interface{}, error) {
	if authtoken.UserFromContext(ctx) == nil {
		return nil, &gqlerror.Error{
			Message: "authentication required",
			Extensions: map[string]interface{}{
				"code": "UNAUTHENTICATED",
			},
		}
	}
	return next(ctx)
}
