package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"golang.org/x/crypto/bcrypt"

	"backend/graph/model"
	"backend/internal/authtoken"
)

type AuthService struct {
	db        *sqlx.DB
	jwtSecret string
	tokenTTL  time.Duration
}

func NewAuthService(db *sqlx.DB, jwtSecret string, tokenTTL time.Duration) *AuthService {
	return &AuthService{db: db, jwtSecret: jwtSecret, tokenTTL: tokenTTL}
}

type userRow struct {
	ID           int64  `db:"id"`
	Username     string `db:"username"`
	Email        string `db:"email"`
	PasswordHash string `db:"password_hash"`
	DisplayName  string `db:"display_name"`
}

// invalidCredentials is the single message returned whether the account
// doesn't exist or the password is wrong, so a login attempt never reveals
// which one it was.
var invalidCredentials = gqlerror.Errorf("invalid username/email or password")

func (s *AuthService) Login(ctx context.Context, usernameOrEmail, password string) (*model.AuthPayload, error) {
	var row userRow
	err := s.db.QueryRowxContext(ctx,
		`SELECT id, username, email, password_hash, display_name
		 FROM users WHERE username=$1 OR email=$1`,
		usernameOrEmail,
	).StructScan(&row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, invalidCredentials
	}
	if err != nil {
		return nil, fmt.Errorf("look up user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(row.PasswordHash), []byte(password)); err != nil {
		return nil, invalidCredentials
	}

	userID := strconv.FormatInt(row.ID, 10)
	token, err := authtoken.GenerateToken(s.jwtSecret, userID, row.Username, row.DisplayName, s.tokenTTL)
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	return &model.AuthPayload{
		Token: token,
		User: &model.AuthUser{
			ID:          userID,
			Username:    row.Username,
			Email:       row.Email,
			DisplayName: row.DisplayName,
		},
	}, nil
}
