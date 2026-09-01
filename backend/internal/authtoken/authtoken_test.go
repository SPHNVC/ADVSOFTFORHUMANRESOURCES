package authtoken

import (
	"context"
	"testing"
	"time"
)

func TestGenerateAndParseTokenRoundTrip(t *testing.T) {
	token, err := GenerateToken("secret", "42", "admin", "Admin", time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}

	user, err := ParseToken("secret", token)
	if err != nil {
		t.Fatalf("ParseToken: %v", err)
	}
	if user.ID != "42" {
		t.Errorf("ID = %q, want %q", user.ID, "42")
	}
	if user.Username != "admin" {
		t.Errorf("Username = %q, want %q", user.Username, "admin")
	}
	if user.DisplayName != "Admin" {
		t.Errorf("DisplayName = %q, want %q", user.DisplayName, "Admin")
	}
}

func TestParseTokenRejectsExpired(t *testing.T) {
	token, err := GenerateToken("secret", "1", "user", "User", -time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	if _, err := ParseToken("secret", token); err == nil {
		t.Error("expected an error for an expired token, got nil")
	}
}

func TestParseTokenRejectsWrongSecret(t *testing.T) {
	token, err := GenerateToken("secret-a", "1", "user", "User", time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	if _, err := ParseToken("secret-b", token); err == nil {
		t.Error("expected an error for a token signed with a different secret, got nil")
	}
}

func TestParseTokenRejectsGarbage(t *testing.T) {
	if _, err := ParseToken("secret", "not-a-jwt"); err == nil {
		t.Error("expected an error for a malformed token, got nil")
	}
}

func TestUserFromContextRoundTrip(t *testing.T) {
	if UserFromContext(context.Background()) != nil {
		t.Error("expected nil user on a context with none attached")
	}

	u := &User{ID: "7", Username: "x", DisplayName: "X"}
	ctx := WithUser(context.Background(), u)
	got := UserFromContext(ctx)
	if got != u {
		t.Errorf("UserFromContext = %v, want %v", got, u)
	}
}

func TestActorFromContext(t *testing.T) {
	if got := ActorFromContext(context.Background()); got != "system" {
		t.Errorf("ActorFromContext(no user) = %q, want %q", got, "system")
	}

	ctx := WithUser(context.Background(), &User{ID: "1", Username: "admin", DisplayName: "Admin"})
	if got := ActorFromContext(ctx); got != "Admin" {
		t.Errorf("ActorFromContext(user) = %q, want %q", got, "Admin")
	}

	// Defensive fallback: the NOT NULL columns this feeds must never see "".
	ctx = WithUser(context.Background(), &User{ID: "1", Username: "admin", DisplayName: ""})
	if got := ActorFromContext(ctx); got != "system" {
		t.Errorf("ActorFromContext(empty display name) = %q, want %q", got, "system")
	}
}
