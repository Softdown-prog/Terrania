package characters

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

const SessionLifetime = 30 * 24 * time.Hour

// Identity can only be produced by resolving a server-held bearer secret.
// Its fields are deliberately private: browser-provided IDs are not authority.
type Identity struct {
	accountID   string
	characterID string
}

// SQLStore uses PostgreSQL-compatible numbered placeholders and database/sql.
// A concrete PostgreSQL driver and runtime credentials are NOT bundled here;
// this package is deliberately not enabled in the public WebSocket handler.
type SQLStore struct{ db *sql.DB }

func NewSQLStore(db *sql.DB) (*SQLStore, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	return &SQLStore{db: db}, nil
}

// CreateGuest reserves one account, one character and one expiring session
// atomically. A future authenticated endpoint must deliver token ONLY over
// HTTPS with appropriate cookie protections, never in a URL or access log.
func (s *SQLStore) CreateGuest(ctx context.Context, name string, now time.Time) (string, Profile, error) {
	if s == nil || s.db == nil || !validDisplayName(name) || now.IsZero() {
		return "", Profile{}, ErrInvalid
	}
	accountID, err := newUUID()
	if err != nil {
		return "", Profile{}, err
	}
	characterID, err := newUUID()
	if err != nil {
		return "", Profile{}, err
	}
	token, digest, err := IssueSecret()
	if err != nil {
		return "", Profile{}, err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", Profile{}, err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err = tx.ExecContext(ctx,
		`INSERT INTO terrania_accounts (id) VALUES ($1)`, accountID); err != nil {
		return "", Profile{}, err
	}
	if _, err = tx.ExecContext(ctx,
		`INSERT INTO terrania_characters (id,account_id,display_name,experience,kills,slime_kills,hp,revision)
       VALUES ($1,$2,$3,0,0,0,100,1)`, characterID, accountID, name); err != nil {
		return "", Profile{}, err
	}
	if _, err = tx.ExecContext(ctx,
		`INSERT INTO terrania_character_sessions (token_hash,account_id,expires_at)
       VALUES ($1,$2,$3)`, digest[:], accountID, now.UTC().Add(SessionLifetime)); err != nil {
		return "", Profile{}, err
	}
	if err = tx.Commit(); err != nil {
		return "", Profile{}, err
	}
	return token, Profile{CharacterID: characterID, AccountID: accountID, DisplayName: name,
		Progress: Progress{HP: 100}, Revision: 1}, nil
}

// Resolve verifies a server-issued credential's SHA-256 hash, revocation and
// expiry inside PostgreSQL. Caller must supply the trusted server clock.
func (s *SQLStore) Resolve(ctx context.Context, secret string, now time.Time) (Identity, Profile, error) {
	if s == nil || s.db == nil || now.IsZero() {
		return Identity{}, Profile{}, ErrInvalid
	}
	digest, err := SecretHash(secret)
	if err != nil {
		return Identity{}, Profile{}, ErrUnauthorized
	}
	var p Profile
	err = s.db.QueryRowContext(ctx, `
       SELECT c.id::text,c.account_id::text,c.display_name,
              c.experience,c.kills,c.slime_kills,c.hp,c.revision
       FROM terrania_character_sessions s
       JOIN terrania_characters c ON c.account_id=s.account_id
       WHERE s.token_hash=$1 AND s.expires_at>$2 AND s.revoked_at IS NULL`,
		digest[:], now.UTC()).Scan(&p.CharacterID, &p.AccountID, &p.DisplayName,
		&p.Progress.Experience, &p.Progress.Kills, &p.Progress.SlimeKills,
		&p.Progress.HP, &p.Revision)
	if errors.Is(err, sql.ErrNoRows) {
		return Identity{}, Profile{}, ErrUnauthorized
	}
	if err != nil {
		return Identity{}, Profile{}, err
	}
	if err = p.Validate(); err != nil {
		return Identity{}, Profile{}, err
	}
	return Identity{accountID: p.AccountID, characterID: p.CharacterID}, p, nil
}

// SaveAuthoritative persists only server-computed values under the resolved
// owner and revision. Optimistic CAS prevents stale room ticks replacing newer
// checkpoints. No endpoint accepts Progress directly from an untrusted client.
func (s *SQLStore) SaveAuthoritative(ctx context.Context, who Identity, progress Progress, revision int64) (int64, error) {
	if s == nil || s.db == nil || !validUUID(who.accountID) || !validUUID(who.characterID) || revision < 1 {
		return 0, ErrInvalid
	}
	if err := progress.Validate(); err != nil {
		return 0, err
	}
	var next int64
	err := s.db.QueryRowContext(ctx, `
       UPDATE terrania_characters SET experience=$1,kills=$2,slime_kills=$3,
            hp=$4,revision=revision+1,updated_at=now()
       WHERE id=$5 AND account_id=$6 AND revision=$7
       RETURNING revision`, progress.Experience, progress.Kills, progress.SlimeKills,
		progress.HP, who.characterID, who.accountID, revision).Scan(&next)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrConflict
	}
	if err != nil {
		return 0, err
	}
	return next, nil
}

// Revoke invalidates the authenticated session. The secret itself is never
// inserted into the database or returned by this method.
func (s *SQLStore) Revoke(ctx context.Context, secret string, now time.Time) error {
	if s == nil || s.db == nil || now.IsZero() {
		return ErrInvalid
	}
	digest, err := SecretHash(secret)
	if err != nil {
		return ErrUnauthorized
	}
	_, err = s.db.ExecContext(ctx,
		`UPDATE terrania_character_sessions SET revoked_at=$2
        WHERE token_hash=$1 AND revoked_at IS NULL`, digest[:], now.UTC())
	return err
}
