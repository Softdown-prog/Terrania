package characters

import (
	"bytes"
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"io"
	"strings"
	"sync"
	"testing"
	"time"
)

type memoryDriver struct { mu sync.Mutex; state *memoryConnection }
func (d *memoryDriver) Open(string) (driver.Conn,error) {
	d.mu.Lock(); defer d.mu.Unlock()
	if d.state==nil {d.state=&memoryConnection{}}
	return d.state,nil
}
type memoryConnection struct {
	mu sync.Mutex
	accountID,characterID,name string
	tokenHash []byte
	expiresAt time.Time
	revoked bool
	xp,kills,slimeKills,hp int
	revision int64
}
func(c *memoryConnection) Prepare(string)(driver.Stmt,error){return nil,errors.New("prepared SQL not expected")}
func(c *memoryConnection) Close()error{return nil}
func(c *memoryConnection) Begin()(driver.Tx,error){return fakeTransaction{},nil}
type fakeTransaction struct{}
func(fakeTransaction) Commit()error{return nil}
func(fakeTransaction) Rollback()error{return nil}
func(c *memoryConnection) ExecContext(_ context.Context,q string,args []driver.NamedValue)(driver.Result,error){
	c.mu.Lock();defer c.mu.Unlock()
	switch {
	case strings.Contains(q,"INSERT INTO terrania_accounts"):
		c.accountID=args[0].Value.(string)
	case strings.Contains(q,"INSERT INTO terrania_characters"):
		c.characterID=args[0].Value.(string)
		c.name=args[2].Value.(string)
		c.hp=100;c.revision=1
	case strings.Contains(q,"INSERT INTO terrania_character_sessions"):
		c.tokenHash=append([]byte{},args[0].Value.([]byte)...)
		c.expiresAt=args[2].Value.(time.Time)
	case strings.Contains(q,"UPDATE terrania_character_sessions"):
		if bytes.Equal(args[0].Value.([]byte),c.tokenHash) {c.revoked=true}
	default:return nil,errors.New("unexpected SQL command")
	}
	return driver.RowsAffected(1),nil
}
func(c *memoryConnection) QueryContext(_ context.Context,q string,args []driver.NamedValue)(driver.Rows,error){
	c.mu.Lock();defer c.mu.Unlock()
	switch {
	case strings.Contains(q,"FROM terrania_character_sessions"):
		hash:=args[0].Value.([]byte)
		now:=args[1].Value.(time.Time)
		if !bytes.Equal(hash,c.tokenHash)||c.revoked||!c.expiresAt.After(now){return &fakeRows{},nil}
		return &fakeRows{data:[][]driver.Value{{c.characterID,c.accountID,c.name,
			int64(c.xp),int64(c.kills),int64(c.slimeKills),int64(c.hp),c.revision}}},nil
	case strings.Contains(q,"UPDATE terrania_characters"):
		if args[4].Value.(string)!=c.characterID || args[5].Value.(string)!=c.accountID ||
			args[6].Value.(int64)!=c.revision {return &fakeRows{},nil}
		c.xp=int(args[0].Value.(int64));c.kills=int(args[1].Value.(int64))
		c.slimeKills=int(args[2].Value.(int64));c.hp=int(args[3].Value.(int64))
		c.revision++
		return &fakeRows{columns:[]string{"revision"},data:[][]driver.Value{{c.revision}}},nil
	default:return nil,errors.New("unexpected SQL query")
	}
}
type fakeRows struct{columns []string;data [][]driver.Value;index int}
func(r *fakeRows) Columns()[]string{
	if len(r.columns)>0{return r.columns}
	return []string{"id","account_id","display_name","experience","kills","slime_kills","hp","revision"}
}
func(r *fakeRows) Close()error{return nil}
func(r *fakeRows) Next(dest []driver.Value)error{
	if r.index>=len(r.data){return io.EOF}
	copy(dest,r.data[r.index]);r.index++;return nil
}

func TestSQLStoreGuestLifecycleRevokeAndCAS(t *testing.T){
	name:="terrania_memory_store_test"
	backend:=&memoryDriver{}
	sql.Register(name,backend)
	db,err:=sql.Open(name,"")
	if err!=nil{t.Fatal(err)}
	defer func(){_ = db.Close()}()
	db.SetMaxOpenConns(1)
	store,err:=NewSQLStore(db)
	if err!=nil{t.Fatal(err)}
	now:=time.Now().UTC().Truncate(time.Second)
	token,issued,err:=store.CreateGuest(context.Background(),"Aventureiro",now)
	if err!=nil || issued.Revision!=1 || issued.Progress.HP!=100 {t.Fatalf("issue: %+v %v",issued,err)}
	backend.mu.Lock();conn:=backend.state;backend.mu.Unlock()
	conn.mu.Lock()
	leaked:=bytes.Contains(conn.tokenHash,[]byte(token))
	length:=len(conn.tokenHash)
	conn.mu.Unlock()
	if leaked||length!=32 {t.Fatal("stored plaintext bearer")}
	identity,p,err:=store.Resolve(context.Background(),token,now.Add(time.Hour))
	if err!=nil || p.CharacterID!=issued.CharacterID || p.Progress.Experience!=0 {t.Fatalf("resolve: %+v %v",p,err)}
	prog:=Progress{Experience:45,Kills:3,SlimeKills:1,HP:110}
	revision,err:=store.SaveAuthoritative(context.Background(),identity,prog,p.Revision)
	if err!=nil||revision!=2 {t.Fatalf("save version=%d: %v",revision,err)}
	if _,err:=store.SaveAuthoritative(context.Background(),identity,prog,1);!errors.Is(err,ErrConflict) {t.Fatalf("stale write accepted: %v",err)}
	_,loaded,err:=store.Resolve(context.Background(),token,now.Add(time.Hour))
	if err!=nil||loaded.Progress!=prog||loaded.Revision!=2 {t.Fatalf("lost progression: %+v %v",loaded,err)}
	if _,_,err:=store.Resolve(context.Background(),token+"x",now);!errors.Is(err,ErrUnauthorized) {t.Fatalf("invalid credential accepted: %v",err)}
	if _,_,err:=store.Resolve(context.Background(),token,now.Add(SessionLifetime));!errors.Is(err,ErrUnauthorized) {t.Fatalf("expired credential accepted: %v",err)}
	if err:=store.Revoke(context.Background(),token,now);err!=nil {t.Fatal(err)}
	if _,_,err:=store.Resolve(context.Background(),token,now);!errors.Is(err,ErrUnauthorized) {t.Fatalf("revoked credential accepted: %v",err)}
}
