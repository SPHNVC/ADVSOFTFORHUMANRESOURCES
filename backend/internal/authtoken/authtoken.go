// Package authtoken mints and verifies the JWTs that carry a logged-in
// user's identity, and threads that identity through context.Context. It has
// no DB dependency so it stays testable as pure functions (aside from the
// clock): internal/service/auth.go calls GenerateToken after checking a
// password, and internal/middleware/auth.go calls ParseToken on every
// request to populate context for the @auth directive to check.
package authtoken

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// User is the identity carried by a validated token.
type User struct {
	ID          string
	Username    string
	DisplayName string
}

type claims struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	jwt.RegisteredClaims
}

// GenerateToken signs a JWT for userID, valid for ttl from now.
func GenerateToken(secret, userID, username, displayName string, ttl time.Duration) (string, error) {
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
		Username:    username,
		DisplayName: displayName,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	})
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

// ParseToken verifies signature and expiry and recovers the User it was
// issued for. Any failure (bad signature, expired, malformed) is a single
// generic error — callers only need to know "not authenticated".
func ParseToken(secret, tokenStr string) (*User, error) {
	parsed, err := jwt.ParseWithClaims(tokenStr, &claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid {
		return nil, fmt.Errorf("invalid token: %w", err)
	}
	c, ok := parsed.Claims.(*claims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}
	return &User{ID: c.Subject, Username: c.Username, DisplayName: c.DisplayName}, nil
}

type contextKey int

const userContextKey contextKey = 0

// WithUser attaches u to ctx.
func WithUser(ctx context.Context, u *User) context.Context {
	return context.WithValue(ctx, userContextKey, u)
}

// UserFromContext returns the user attached by WithUser, or nil if none.
func UserFromContext(ctx context.Context) *User {
	u, _ := ctx.Value(userContextKey).(*User)
	return u
}

// ActorFromContext returns the display name of the user attached to ctx, for
// recording in created_by/modified_by/author columns. Every caller sits
// behind an @auth-guarded mutation so a user is always present in practice;
// the "system" fallback exists only because those columns are NOT NULL and
// must never receive an empty string.
func ActorFromContext(ctx context.Context) string {
	if u := UserFromContext(ctx); u != nil && u.DisplayName != "" {
		return u.DisplayName
	}
	return "system"
}
