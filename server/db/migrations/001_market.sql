-- Additive foundation for ADR 0010. The browser is never a database principal.
CREATE TABLE market.accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_provider text NOT NULL CHECK (length(auth_provider) BETWEEN 1 AND 40),
 auth_subject text NOT NULL CHECK (length(auth_subject) BETWEEN 1 AND 256),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 60),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(auth_provider,auth_subject)
);
CREATE TABLE market.item_catalog (
 id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{0,63}$'),
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
 category text NOT NULL CHECK (category IN ('material','consumable','food','weapon','equipment','collectible')),
 rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare')),
 max_stack integer NOT NULL CHECK (max_stack BETWEEN 1 AND 999),
 attributes jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(attributes)='object' AND pg_column_size(attributes)<=8192),
 trade_enabled boolean NOT NULL DEFAULT false,
 claim_limit_per_day integer NOT NULL DEFAULT 0 CHECK (claim_limit_per_day BETWEEN 0 AND 10),
 active boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (rarity='rare' OR (NOT trade_enabled AND claim_limit_per_day=0))
);
CREATE TABLE market.rare_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 catalog_id text NOT NULL REFERENCES market.item_catalog(id) ON DELETE RESTRICT,
 owner_account_id uuid NOT NULL REFERENCES market.accounts(id) ON DELETE RESTRICT,
 state text NOT NULL DEFAULT 'vault' CHECK (state IN ('vault','checked_out','in_trade','retired')),
 version bigint NOT NULL DEFAULT 1 CHECK (version>0),
 checkout_token uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((state='checked_out')=(checkout_token IS NOT NULL))
);
CREATE INDEX rare_items_owner_idx ON market.rare_items(owner_account_id,state,id);
CREATE TABLE market.trades (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 proposer_account_id uuid NOT NULL REFERENCES market.accounts(id) ON DELETE RESTRICT,
 recipient_account_id uuid NOT NULL REFERENCES market.accounts(id) ON DELETE RESTRICT,
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','completed','cancelled','expired')),
 version bigint NOT NULL DEFAULT 1 CHECK (version>0),
 idempotency_key uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 completed_at timestamptz,
 CHECK (proposer_account_id<>recipient_account_id),
 CHECK (expires_at>created_at AND expires_at<=created_at+interval '7 days'),
 CHECK ((state='completed')=(completed_at IS NOT NULL)),
 UNIQUE(proposer_account_id,idempotency_key)
);
CREATE INDEX trades_recipient_idx ON market.trades(recipient_account_id,state,created_at DESC);
CREATE TABLE market.trade_items (
 trade_id uuid NOT NULL REFERENCES market.trades(id) ON DELETE RESTRICT,
 item_id uuid NOT NULL REFERENCES market.rare_items(id) ON DELETE RESTRICT,
 offered_by_account_id uuid NOT NULL REFERENCES market.accounts(id) ON DELETE RESTRICT,
 expected_version bigint NOT NULL CHECK (expected_version>0),
 PRIMARY KEY(trade_id,item_id)
);
CREATE TABLE market.trade_confirmations (
 trade_id uuid NOT NULL REFERENCES market.trades(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES market.accounts(id) ON DELETE RESTRICT,
 confirmed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(trade_id,account_id)
);
CREATE TABLE market.item_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 item_id uuid NOT NULL REFERENCES market.rare_items(id) ON DELETE RESTRICT,
 event_type text NOT NULL CHECK (event_type IN ('registered','checked_out','returned','transferred','reversed','retired')),
 actor_account_id uuid REFERENCES market.accounts(id) ON DELETE RESTRICT,
 from_account_id uuid REFERENCES market.accounts(id) ON DELETE RESTRICT,
 to_account_id uuid REFERENCES market.accounts(id) ON DELETE RESTRICT,
 trade_id uuid REFERENCES market.trades(id) ON DELETE RESTRICT,
 metadata jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata)='object' AND pg_column_size(metadata)<=8192),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX item_events_item_idx ON market.item_events(item_id,id);
CREATE TABLE market.rare_claims (
 account_id uuid NOT NULL REFERENCES market.accounts(id) ON DELETE RESTRICT,
 idempotency_key uuid NOT NULL,
 catalog_id text NOT NULL REFERENCES market.item_catalog(id) ON DELETE RESTRICT,
 item_id uuid NOT NULL UNIQUE REFERENCES market.rare_items(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,idempotency_key)
);
CREATE INDEX rare_claims_rate_idx ON market.rare_claims(account_id,catalog_id,created_at DESC);

CREATE FUNCTION market.append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit records are append only' USING ERRCODE='23514'; END $$;
CREATE TRIGGER item_events_immutable BEFORE UPDATE OR DELETE ON market.item_events
 FOR EACH ROW EXECUTE FUNCTION market.append_only();
CREATE TRIGGER rare_claims_immutable BEFORE UPDATE OR DELETE ON market.rare_claims
 FOR EACH ROW EXECUTE FUNCTION market.append_only();

CREATE FUNCTION market.validate_rare_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM market.item_catalog WHERE id=NEW.catalog_id AND rarity='rare') THEN
  RAISE EXCEPTION 'Only catalogued rare items can enter the vault' USING ERRCODE='23514';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.catalog_id<>OLD.catalog_id OR NEW.created_at<>OLD.created_at OR NEW.version<>OLD.version+1) THEN
  RAISE EXCEPTION 'Immutable identity or stale item version' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER rare_items_validate BEFORE INSERT OR UPDATE ON market.rare_items
 FOR EACH ROW EXECUTE FUNCTION market.validate_rare_item();

CREATE FUNCTION market.freeze_trade_terms() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE key uuid;
BEGIN
 key:=CASE WHEN TG_OP='DELETE' THEN OLD.trade_id ELSE NEW.trade_id END;
 PERFORM id FROM market.trades WHERE id=key FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM market.trades WHERE id=key AND state='pending') OR
  EXISTS(SELECT 1 FROM market.trade_confirmations WHERE trade_id=key) THEN
  RAISE EXCEPTION 'Confirmed trade terms are immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='UPDATE' AND OLD.trade_id<>NEW.trade_id THEN
  RAISE EXCEPTION 'Trade identity is immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER trade_items_frozen BEFORE INSERT OR UPDATE OR DELETE ON market.trade_items
 FOR EACH ROW EXECUTE FUNCTION market.freeze_trade_terms();
CREATE FUNCTION market.validate_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM market.trades WHERE id=NEW.trade_id AND state='pending'
   AND NEW.account_id IN(proposer_account_id,recipient_account_id)) THEN
  RAISE EXCEPTION 'Confirmation not authorized' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER confirmations_validate BEFORE INSERT ON market.trade_confirmations
 FOR EACH ROW EXECUTE FUNCTION market.validate_confirmation();
CREATE TRIGGER confirmations_immutable BEFORE UPDATE OR DELETE ON market.trade_confirmations
 FOR EACH ROW EXECUTE FUNCTION market.append_only();

-- Trusted future account service supplies actor from its authenticated session.
-- No EXECUTE or write grants are given to the current read-only web API.
CREATE FUNCTION market.confirm_trade(p_actor uuid,p_trade uuid,p_version bigint)
RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog,market AS $$
DECLARE t market.trades%ROWTYPE; n integer;
BEGIN
 SELECT * INTO t FROM market.trades WHERE id=p_trade FOR UPDATE;
 IF NOT FOUND OR p_actor IS NULL OR p_actor NOT IN (t.proposer_account_id,t.recipient_account_id) THEN
  RAISE EXCEPTION 'Trade not authorized' USING ERRCODE='42501';
 END IF;
 IF t.state='completed' THEN RETURN t.state; END IF;
 IF t.state<>'pending' OR p_version IS NULL OR t.version<>p_version THEN
  RAISE EXCEPTION 'Stale trade' USING ERRCODE='23514';
 END IF;
 IF t.expires_at<=now() THEN
  UPDATE market.trades SET state='expired',version=version+1 WHERE id=t.id; RETURN 'expired';
 END IF;
 IF EXISTS (SELECT 1 FROM market.accounts WHERE id IN(t.proposer_account_id,t.recipient_account_id) AND status<>'active') THEN
  RAISE EXCEPTION 'Account unavailable' USING ERRCODE='23514';
 END IF;
 INSERT INTO market.trade_confirmations(trade_id,account_id) VALUES(t.id,p_actor) ON CONFLICT DO NOTHING;
 SELECT count(*) INTO n FROM market.trade_confirmations
  WHERE trade_id=t.id AND account_id IN(t.proposer_account_id,t.recipient_account_id);
 IF n<2 THEN RETURN 'pending'; END IF;
 -- Stable lock ordering across competing trades; a checkout cannot race transfer.
 PERFORM r.id FROM market.rare_items r JOIN market.trade_items i ON i.item_id=r.id
  WHERE i.trade_id=t.id ORDER BY r.id FOR UPDATE OF r;
 SELECT count(*) INTO n FROM market.trade_items WHERE trade_id=t.id;
 IF n<1 OR n>20 OR EXISTS (
  SELECT 1 FROM market.trade_items i JOIN market.rare_items r ON r.id=i.item_id
   JOIN market.item_catalog c ON c.id=r.catalog_id
  WHERE i.trade_id=t.id AND (r.owner_account_id<>i.offered_by_account_id OR
   i.offered_by_account_id NOT IN(t.proposer_account_id,t.recipient_account_id) OR
   r.version<>i.expected_version OR r.state<>'vault' OR NOT c.active OR NOT c.trade_enabled)
 ) THEN RAISE EXCEPTION 'Item ownership, state or version changed' USING ERRCODE='23514'; END IF;
 UPDATE market.rare_items r SET owner_account_id=CASE i.offered_by_account_id
   WHEN t.proposer_account_id THEN t.recipient_account_id ELSE t.proposer_account_id END,version=r.version+1
  FROM market.trade_items i WHERE i.trade_id=t.id AND i.item_id=r.id;
 INSERT INTO market.item_events(item_id,event_type,actor_account_id,from_account_id,to_account_id,trade_id)
  SELECT r.id,'transferred',p_actor,i.offered_by_account_id,r.owner_account_id,t.id
  FROM market.trade_items i JOIN market.rare_items r ON r.id=i.item_id WHERE i.trade_id=t.id;
 UPDATE market.trades SET state='completed',version=version+1,completed_at=now() WHERE id=t.id;
 RETURN 'completed';
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA market FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA market FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA market FROM PUBLIC;
GRANT USAGE ON SCHEMA market TO terrania_app;
GRANT SELECT ON market.item_catalog,market.schema_migrations TO terrania_app;
