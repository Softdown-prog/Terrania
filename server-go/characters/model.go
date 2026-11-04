// Package characters prepares authenticated, durable character ownership.
// It deliberately exposes no HTTP routes or browser-trusted progression.
package characters

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"
)

const TokenBytes = 32
const MaxExperience = 36750 // Must match engine.MaxExperience (level 50).

var (
	ErrInvalid      = errors.New("invalid character state or credentials")
	ErrUnauthorized = errors.New("invalid or expired character session")
	ErrConflict     = errors.New("character revision conflict")
)

// Progress represents authoritative server-tick output, not a client input.
// Max HP and level are always derived from XP and never accepted separately.
type Progress struct {
	Experience int
	Kills      int
	SlimeKills int
	HP         int
}

func (p Progress) Level() int {
	level := 1
	for level < 50 && p.Experience >= 30*(level+1)*level/2 {
		level++
	}
	return level
}
func (p Progress) MaxHP() int { return 100 + (p.Level()-1)*10 }
func (p Progress) Validate() error {
	if p.Experience < 0 || p.Experience > MaxExperience ||
		p.Kills < 0 || p.SlimeKills < 0 || p.SlimeKills > p.Kills ||
		p.HP < 0 || p.HP > p.MaxHP() {
		return ErrInvalid
	}
	return nil
}

type Profile struct {
	CharacterID string
	AccountID   string
	DisplayName string
	Progress    Progress
	Revision    int64
}

func (p Profile) Validate() error {
	if !validUUID(p.CharacterID) || !validUUID(p.AccountID) ||
		!validDisplayName(p.DisplayName) || p.Revision < 1 {
		return ErrInvalid
	}
	return p.Progress.Validate()
}

func validDisplayName(name string) bool {
	if strings.TrimSpace(name) != name || name == "" || !utf8.ValidString(name) || utf8.RuneCountInString(name) > 32 {
		return false
	}
	for _, r := range name {
		if unicode.IsControl(r) {
			return false
		}
	}
	return true
}

func validUUID(value string) bool {
	if len(value) != 36 || value[8] != '-' || value[13] != '-' || value[18] != '-' || value[23] != '-' || value[14] != '4' {
		return false
	}
	for i, c := range value {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			continue
		}
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') {
			return false
		}
	}
	return value[19] == '8' || value[19] == '9' || value[19] == 'a' || value[19] == 'b'
}

func newUUID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[:4], b[4:6], b[6:8], b[8:10], b[10:]), nil
}

// IssueSecret returns a 256-bit bearer secret exactly once plus only its hash.
// Only the SHA-256 digest may be stored in PostgreSQL. Never log the raw token.
func IssueSecret() (string, [sha256.Size]byte, error) {
	var raw [TokenBytes]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", [sha256.Size]byte{}, err
	}
	return base64.RawURLEncoding.EncodeToString(raw[:]), sha256.Sum256(raw[:]), nil
}

// SecretHash rejects short, non-canonical or malformed credentials; no UUID,
// player name, room name or IP address is an authentication credential.
func SecretHash(secret string) ([sha256.Size]byte, error) {
	var zero [sha256.Size]byte
	if len(secret) != base64.RawURLEncoding.EncodedLen(TokenBytes) {
		return zero, ErrUnauthorized
	}
	raw, err := base64.RawURLEncoding.DecodeString(secret)
	if err != nil || len(raw) != TokenBytes || base64.RawURLEncoding.EncodeToString(raw) != secret {
		return zero, ErrUnauthorized
	}
	return sha256.Sum256(raw), nil
}
