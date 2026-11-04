package characters

import (
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"os"
	"strings"
	"testing"
)

func TestSessionSecretsRandomCanonicalAndNotPredictable(t *testing.T) {
	seen := map[string]struct{}{}
	for i := 0; i < 256; i++ {
		token, digest, err := IssueSecret()
		if err != nil { t.Fatal(err) }
		if _, ok := seen[token]; ok { t.Fatal("reused secret") }
		seen[token] = struct{}{}
		if len(token) != base64.RawURLEncoding.EncodedLen(TokenBytes) { t.Fatal("weak token size") }
		got, err := SecretHash(token)
		if err != nil || got != digest || got == sha256.Sum256([]byte(token)) { t.Fatal("wrong credential hash") }
	}
	for _, token := range []string{"", "test", "../../admin", strings.Repeat("A",44), strings.Repeat("!",43), strings.Repeat("A",42)+"="} {
		if _, err := SecretHash(token); !errors.Is(err, ErrUnauthorized) { t.Fatalf("accepted malformed secret %q", token) }
	}
}

func TestProgressBoundsAndDerivedHP(t *testing.T) {
	cases := []struct{xp,level,maxHP int}{
		{0,1,100},{10,1,100},{30,2,110},{45,2,110},{90,3,120},{36750,50,590},
	}
	for _, tc := range cases {
		p := Progress{Experience:tc.xp,HP:tc.maxHP,Kills:12,SlimeKills:2}
		if p.Level()!=tc.level || p.MaxHP()!=tc.maxHP || p.Validate()!=nil { t.Fatalf("bad stats %+v",p) }
	}
	bad := []Progress{
		{Experience:-1,HP:100},{Experience:36751,HP:100},
		{Experience:0,HP:101},{Experience:30,HP:111},
		{Experience:0,HP:-1},{Experience:0,HP:100,Kills:-1},
		{Experience:0,HP:100,Kills:2,SlimeKills:3},
	}
	for _, p := range bad { if p.Validate()==nil { t.Fatalf("accepted %+v",p) } }
}

func TestRandomUUIDAndNames(t *testing.T) {
	seen := map[string]bool{}
	for i:=0;i<100;i++ {
		id,err:=newUUID()
		if err!=nil || !validUUID(id) || seen[id] { t.Fatalf("bad random UUID %s: %v",id,err) }
		seen[id]=true
	}
	for _,name:=range []string{"", " Alice", "Bob ", "\x00Bob",strings.Repeat("a",33)} {
		if validDisplayName(name) { t.Fatalf("unsafe name accepted: %q",name) }
	}
	if !validDisplayName("Aventureiro 42") || !validDisplayName("Lúcia") { t.Fatal("valid name rejected") }
}

func TestPostgresSchemaDoesNotStoreBearerSecrets(t *testing.T) {
	sql,err:=os.ReadFile("migrations/001_characters.sql")
	if err!=nil {t.Fatal(err)}
	normalized:=strings.ToLower(string(sql))
	for _,term:=range []string{"token_hash bytea", "on delete cascade", "check (experience between 0 and 36750)", "revision bigint", "revoked_at timestamptz"} {
		if !strings.Contains(normalized,term) {t.Fatalf("missing schema protection: %s",term)}
	}
	if strings.Contains(normalized,"plaintext_token") || strings.Contains(normalized,"password varchar") {t.Fatal("plaintext secret column")}
}
