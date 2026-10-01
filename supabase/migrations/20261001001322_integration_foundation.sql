BEGIN;

CREATE SCHEMA korset_integration;
REVOKE ALL ON SCHEMA korset_integration FROM PUBLIC, anon, authenticated;

CREATE TABLE korset_integration.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  token_hash text UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','revoked')),
  source_kind text NOT NULL DEFAULT '1c',
  source_instance_id text,
  last_sequence bigint NOT NULL DEFAULT 0,
  connector_version text,
  last_seen_at timestamptz,
  last_applied_at timestamptz,
  last_error_code text,
  counters jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX integration_one_current_connection ON korset_integration.connections(store_id) WHERE status<>'revoked';

ALTER TABLE public.store_products ADD COLUMN sync_integration_id uuid REFERENCES korset_integration.connections(id);
CREATE INDEX store_products_sync_integration_idx ON public.store_products(sync_integration_id) WHERE sync_integration_id IS NOT NULL;

CREATE TABLE korset_integration.snapshots (
  integration_id uuid NOT NULL REFERENCES korset_integration.connections ON DELETE CASCADE,
  id uuid NOT NULL,
  expected_count integer NOT NULL CHECK (expected_count BETWEEN 0 AND 100000),
  start_sequence bigint NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','complete','aborted')),
  started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(integration_id,id)
);
CREATE UNIQUE INDEX integration_one_open_snapshot ON korset_integration.snapshots(integration_id) WHERE status='open';

CREATE TABLE korset_integration.source_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES korset_integration.connections ON DELETE CASCADE,
  external_id text NOT NULL,
  variant_id text NOT NULL,
  unit_id text NOT NULL,
  revision bigint NOT NULL CHECK (revision>0),
  last_sequence bigint NOT NULL,
  payload jsonb NOT NULL,
  snapshot_id uuid,
  store_product_id uuid UNIQUE REFERENCES public.store_products ON DELETE SET NULL,
  resolution_code text NOT NULL DEFAULT 'UNKNOWN_PRODUCT',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id,external_id,variant_id,unit_id)
);
CREATE INDEX integration_source_snapshot_idx ON korset_integration.source_items(integration_id,snapshot_id);
CREATE INDEX integration_source_issues_idx ON korset_integration.source_items(integration_id,resolution_code);

CREATE TABLE korset_integration.receipts (
  integration_id uuid NOT NULL REFERENCES korset_integration.connections ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  sequence bigint NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(integration_id,request_id),
  UNIQUE(integration_id,sequence)
);
CREATE INDEX integration_receipts_created_idx ON korset_integration.receipts(integration_id,created_at);

CREATE TABLE korset_integration.request_windows (
  integration_id uuid PRIMARY KEY REFERENCES korset_integration.connections ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  requests integer NOT NULL DEFAULT 0
);
ALTER TABLE korset_integration.request_windows ENABLE ROW LEVEL SECURITY;

CREATE TABLE korset_integration.owner_actions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL,
  store_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  source_id uuid,
  store_product_id uuid,
  action text NOT NULL CHECK (action IN ('create','rotate','pause','resume','revoke','resolve','adopt')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE korset_integration.owner_actions ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION korset_integration.check_request_budget(p_integration_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE count_requests integer;
BEGIN
  INSERT INTO korset_integration.request_windows(integration_id,requests) VALUES(p_integration_id,1)
  ON CONFLICT(integration_id) DO UPDATE SET
    requests=CASE WHEN korset_integration.request_windows.started_at<=now()-interval '1 minute' THEN 1 ELSE korset_integration.request_windows.requests+1 END,
    started_at=CASE WHEN korset_integration.request_windows.started_at<=now()-interval '1 minute' THEN now() ELSE korset_integration.request_windows.started_at END
  RETURNING requests INTO count_requests;
  IF count_requests>120 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;
END;
$$;

ALTER TABLE korset_integration.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE korset_integration.source_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE korset_integration.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE korset_integration.receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON korset_integration.owner_actions FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA korset_integration FROM PUBLIC,anon,authenticated;

CREATE FUNCTION korset_integration.summary(p_connection korset_integration.connections)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',p_connection.id,'status',p_connection.status,'source_kind',p_connection.source_kind,
   'connector_version',p_connection.connector_version,'last_seen_at',p_connection.last_seen_at,
   'last_applied_at',p_connection.last_applied_at,'last_error_code',p_connection.last_error_code,'counters',p_connection.counters);
$$;

CREATE FUNCTION public.korset_integration_manage(p_owner_id uuid,p_store_id uuid,p_action text,p_token_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c korset_integration.connections;
BEGIN
  PERFORM 1 FROM public.stores WHERE id=p_store_id AND owner_id=p_owner_id AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_STORE_OWNER'; END IF;
  SELECT * INTO c FROM korset_integration.connections WHERE store_id=p_store_id
    ORDER BY (status<>'revoked') DESC,created_at DESC LIMIT 1 FOR UPDATE;
  IF p_action='status' THEN
    RETURN jsonb_build_object('integration',CASE WHEN c.id IS NULL THEN NULL ELSE korset_integration.summary(c) END,
      'issues',coalesce((SELECT jsonb_agg(jsonb_build_object('source_id',s.id,'external_id',s.external_id,'variant_id',s.variant_id,
        'unit_id',s.unit_id,'name',s.payload->>'name','code',s.resolution_code,'revision',s.revision,
        'source_regular_minor',(s.payload#>>'{price,regular_minor}')::bigint,
        'source_stock_quantity',s.payload#>>'{stock,quantity}',
        'target_price_kzt',target.price_kzt,'target_stock_status',target.stock_status,'target_updated_at',target.updated_at))
        FROM (SELECT * FROM korset_integration.source_items WHERE integration_id=c.id AND resolution_code<>'MATCHED' ORDER BY updated_at DESC LIMIT 50) s
        LEFT JOIN LATERAL (
          SELECT sp.price_kzt,sp.stock_status,sp.updated_at FROM public.global_products gp
          JOIN public.store_products sp ON sp.store_id=p_store_id AND (sp.ean=gp.ean OR sp.global_product_id=gp.id)
          WHERE gp.is_active AND gp.id IN (
            SELECT g.id FROM jsonb_array_elements(s.payload->'barcodes') bc JOIN public.global_products g ON g.ean=bc->>'value'
              WHERE bc->>'kind'='gtin' AND g.is_active
            UNION SELECT a.global_product_id FROM jsonb_array_elements(s.payload->'barcodes') bc
              JOIN public.product_ean_aliases a ON a.ean=bc->>'value' AND a.status='trusted' AND a.is_active
              JOIN public.global_products g ON g.id=a.global_product_id AND g.is_active WHERE bc->>'kind'='gtin')
          ORDER BY (sp.ean=gp.ean) DESC,sp.updated_at DESC LIMIT 1
        ) target ON true),'[]'::jsonb));
  END IF;
  IF p_action='create' THEN
    IF c.id IS NOT NULL AND c.status<>'revoked' THEN RAISE EXCEPTION 'INTEGRATION_EXISTS'; END IF;
    IF p_token_hash IS NULL THEN RAISE EXCEPTION 'INVALID_TOKEN'; END IF;
    INSERT INTO korset_integration.connections(store_id,token_hash) VALUES(p_store_id,p_token_hash) RETURNING * INTO c;
  ELSIF c.id IS NULL THEN RAISE EXCEPTION 'INTEGRATION_NOT_FOUND';
  ELSIF p_action='rotate' THEN
    IF c.status='revoked' OR p_token_hash IS NULL THEN RAISE EXCEPTION 'INTEGRATION_REVOKED'; END IF;
    UPDATE korset_integration.connections SET token_hash=p_token_hash WHERE id=c.id RETURNING * INTO c;
  ELSIF p_action IN ('pause','resume','revoke') THEN
    IF c.status='revoked' THEN RAISE EXCEPTION 'INTEGRATION_REVOKED'; END IF;
    UPDATE korset_integration.connections SET status=CASE p_action WHEN 'pause' THEN 'paused' WHEN 'resume' THEN 'active' ELSE 'revoked' END,
      token_hash=CASE WHEN p_action='revoke' THEN NULL ELSE token_hash END WHERE id=c.id RETURNING * INTO c;
    IF p_action='revoke' THEN
      UPDATE public.store_products SET sync_integration_id=NULL WHERE sync_integration_id=c.id;
      UPDATE korset_integration.snapshots SET status='aborted' WHERE integration_id=c.id AND status='open';
    END IF;
  ELSE RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  INSERT INTO korset_integration.owner_actions(actor_id,store_id,integration_id,action)
  VALUES(p_owner_id,p_store_id,c.id,p_action);
  RETURN jsonb_build_object('integration',korset_integration.summary(c));
END;
$$;

CREATE FUNCTION korset_integration.project_item(p_item_id uuid,p_store_id uuid)
RETURNS text LANGUAGE plpgsql SET search_path='' AS $$
DECLARE s korset_integration.source_items; g public.global_products; sp public.store_products;
  matches integer; regular bigint; sale bigint; quantity numeric; issue text; result_id uuid;
BEGIN
  SELECT * INTO STRICT s FROM korset_integration.source_items WHERE id=p_item_id;
  regular := (s.payload#>>'{price,regular_minor}')::bigint;
  sale := (s.payload#>>'{price,sale_minor}')::bigint;
  quantity := (s.payload#>>'{stock,quantity}')::numeric;
  SELECT count(DISTINCT candidate.id) INTO matches FROM (
    SELECT gp.id FROM jsonb_array_elements(s.payload->'barcodes') bc JOIN public.global_products gp ON gp.ean=bc->>'value'
      WHERE bc->>'kind'='gtin' AND gp.is_active
    UNION SELECT gp.id FROM jsonb_array_elements(s.payload->'barcodes') bc
      JOIN public.product_ean_aliases a ON a.ean=bc->>'value' AND a.status='trusted' AND a.is_active
      JOIN public.global_products gp ON gp.id=a.global_product_id AND gp.is_active WHERE bc->>'kind'='gtin'
  ) candidate;
  issue := CASE WHEN matches=0 THEN 'UNKNOWN_PRODUCT' WHEN matches>1 THEN 'BARCODE_CONFLICT'
    WHEN regular IS NULL THEN 'PRICE_MISSING' WHEN regular%100<>0 THEN 'PRICE_PRECISION_UNSUPPORTED'
    WHEN quantity IS NULL THEN 'STOCK_UNKNOWN' WHEN s.payload#>>'{stock,unit}'<>'piece' THEN 'SALE_UNIT_UNSUPPORTED' ELSE NULL END;
  IF issue IS NOT NULL THEN
    UPDATE public.store_products SET is_active=false,updated_at=now() WHERE id=s.store_product_id AND sync_integration_id=s.integration_id;
    UPDATE korset_integration.source_items SET resolution_code=issue WHERE id=s.id;
    RETURN 'unresolved';
  END IF;
  SELECT gp.* INTO g FROM public.global_products gp WHERE gp.is_active AND gp.id IN (
    SELECT gp2.id FROM jsonb_array_elements(s.payload->'barcodes') bc JOIN public.global_products gp2 ON gp2.ean=bc->>'value' WHERE bc->>'kind'='gtin' AND gp2.is_active
    UNION SELECT a.global_product_id FROM jsonb_array_elements(s.payload->'barcodes') bc JOIN public.product_ean_aliases a ON a.ean=bc->>'value' AND a.status='trusted' AND a.is_active WHERE bc->>'kind'='gtin'
  ) LIMIT 1;
  SELECT * INTO sp FROM public.store_products WHERE store_id=p_store_id AND ean=g.ean FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.store_products other WHERE other.store_id=p_store_id AND other.global_product_id=g.id AND other.ean<>g.ean)
    OR (sp.id IS NOT NULL AND sp.sync_integration_id IS DISTINCT FROM s.integration_id)
    OR EXISTS(SELECT 1 FROM korset_integration.source_items x WHERE x.store_product_id=sp.id AND x.id<>s.id) THEN
    UPDATE korset_integration.source_items SET resolution_code='OWNERSHIP_CONFLICT' WHERE id=s.id;
    RETURN 'conflicts';
  END IF;
  IF s.store_product_id IS NOT NULL AND s.store_product_id IS DISTINCT FROM sp.id THEN
    UPDATE public.store_products SET is_active=false,updated_at=now() WHERE id=s.store_product_id AND sync_integration_id=s.integration_id;
  END IF;
  INSERT INTO public.store_products(store_id,ean,global_product_id,local_name,local_sku,price_kzt,stock_status,is_active,sync_integration_id)
  VALUES(p_store_id,g.ean,g.id,s.payload->>'name',s.external_id,(regular/100)::integer,
    CASE WHEN quantity<=0 THEN 'out_of_stock' ELSE 'in_stock' END,(s.payload->>'active')::boolean,s.integration_id)
  ON CONFLICT(store_id,ean) DO UPDATE SET global_product_id=excluded.global_product_id,local_name=excluded.local_name,
    local_sku=excluded.local_sku,price_kzt=excluded.price_kzt,stock_status=excluded.stock_status,is_active=excluded.is_active,
    old_price_kzt=NULL,discount_percent=NULL,updated_at=now()
  WHERE public.store_products.sync_integration_id=excluded.sync_integration_id
  RETURNING id INTO result_id;
  IF result_id IS NULL THEN
    UPDATE korset_integration.source_items SET resolution_code='OWNERSHIP_CONFLICT' WHERE id=s.id;
    RETURN 'conflicts';
  END IF;
  UPDATE korset_integration.source_items SET store_product_id=result_id,resolution_code='MATCHED' WHERE id=s.id;
  RETURN 'applied';
END;
$$;

CREATE FUNCTION public.korset_integration_resolve(
  p_owner_id uuid,p_store_id uuid,p_source_id uuid,p_expected_revision bigint,
  p_adopt boolean,p_expected_manual_price integer,p_expected_manual_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c korset_integration.connections; s korset_integration.source_items; g_id uuid; g_ean text;
  target public.store_products; candidate_count integer; outcome text; old_link_id uuid; old_status text;
BEGIN
  PERFORM 1 FROM public.stores WHERE id=p_store_id AND owner_id=p_owner_id AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_STORE_OWNER'; END IF;
  SELECT * INTO c FROM korset_integration.connections WHERE store_id=p_store_id AND status='active' FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'INTEGRATION_NOT_ACTIVE'; END IF;
  SELECT * INTO s FROM korset_integration.source_items WHERE id=p_source_id AND integration_id=c.id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'SOURCE_NOT_FOUND'; END IF;
  IF p_expected_revision IS NULL OR s.revision<>p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  IF p_adopt IS NULL THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;

  IF p_adopt THEN
    SELECT count(DISTINCT candidate.id),min(candidate.id::text)::uuid INTO candidate_count,g_id FROM (
      SELECT gp.id FROM jsonb_array_elements(s.payload->'barcodes') bc JOIN public.global_products gp ON gp.ean=bc->>'value'
        WHERE bc->>'kind'='gtin' AND gp.is_active
      UNION SELECT gp.id FROM jsonb_array_elements(s.payload->'barcodes') bc
        JOIN public.product_ean_aliases a ON a.ean=bc->>'value' AND a.status='trusted' AND a.is_active
        JOIN public.global_products gp ON gp.id=a.global_product_id AND gp.is_active WHERE bc->>'kind'='gtin'
    ) candidate;
    IF candidate_count<>1 THEN RAISE EXCEPTION 'RESOLUTION_UNSAFE'; END IF;
    SELECT ean INTO g_ean FROM public.global_products WHERE id=g_id AND is_active;
    SELECT * INTO target FROM public.store_products WHERE store_id=p_store_id AND ean=g_ean FOR UPDATE;
    IF target.id IS NULL OR (target.global_product_id IS NOT NULL AND target.global_product_id<>g_id)
      OR target.sync_integration_id IS NOT NULL
      OR p_expected_manual_updated_at IS NULL
      OR target.price_kzt IS DISTINCT FROM p_expected_manual_price
      OR target.updated_at IS DISTINCT FROM p_expected_manual_updated_at THEN RAISE EXCEPTION 'OWNERSHIP_CONFLICT'; END IF;
    IF EXISTS(SELECT 1 FROM public.store_products sp WHERE sp.store_id=p_store_id AND sp.global_product_id=g_id AND sp.id<>target.id)
      OR EXISTS(SELECT 1 FROM korset_integration.source_items other
        WHERE other.integration_id=c.id AND other.id<>s.id AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(other.payload->'barcodes') bc
          LEFT JOIN public.global_products gp ON gp.ean=bc->>'value' AND gp.is_active
          LEFT JOIN public.product_ean_aliases a ON a.ean=bc->>'value' AND a.status='trusted' AND a.is_active
          WHERE bc->>'kind'='gtin' AND (gp.id=g_id OR a.global_product_id=g_id)))
      THEN RAISE EXCEPTION 'OWNERSHIP_CONFLICT'; END IF;
    SELECT old.id,conn.status INTO old_link_id,old_status
      FROM korset_integration.source_items old JOIN korset_integration.connections conn ON conn.id=old.integration_id
      WHERE old.store_product_id=target.id AND old.id<>s.id FOR UPDATE OF old;
    IF old_link_id IS NOT NULL AND old_status<>'revoked' THEN RAISE EXCEPTION 'OWNERSHIP_CONFLICT'; END IF;
    IF old_link_id IS NOT NULL THEN
      UPDATE korset_integration.source_items SET store_product_id=NULL WHERE id=old_link_id;
    END IF;
    UPDATE public.store_products SET sync_integration_id=c.id WHERE id=target.id;
  END IF;

  outcome:=korset_integration.project_item(s.id,p_store_id);
  IF p_adopt AND outcome<>'applied' THEN RAISE EXCEPTION 'RESOLUTION_UNSAFE'; END IF;
  UPDATE korset_integration.connections SET last_error_code=CASE WHEN EXISTS(
    SELECT 1 FROM korset_integration.source_items WHERE integration_id=c.id AND resolution_code<>'MATCHED')
    THEN 'ITEMS_REQUIRE_REVIEW' ELSE NULL END WHERE id=c.id;
  INSERT INTO korset_integration.owner_actions(actor_id,store_id,integration_id,source_id,store_product_id,action)
    VALUES(p_owner_id,p_store_id,c.id,s.id,CASE WHEN outcome='applied' THEN
      (SELECT store_product_id FROM korset_integration.source_items WHERE id=s.id) ELSE NULL END,
      CASE WHEN p_adopt THEN 'adopt' ELSE 'resolve' END);
  RETURN public.korset_integration_manage(p_owner_id,p_store_id,'status',NULL);
END;
$$;

CREATE FUNCTION public.korset_integration_ingest(p_token_hash text,p_envelope jsonb,p_payload_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c korset_integration.connections; receipt korset_integration.receipts; snap korset_integration.snapshots;
  e jsonb; source_row korset_integration.source_items; outcome text; result jsonb;
  sequence bigint; snapshot uuid; missing integer; total integer; counted integer;
  source_count integer:=0; verified_same_revision integer:=0;
BEGIN
  SELECT * INTO c FROM korset_integration.connections WHERE token_hash=p_token_hash FOR UPDATE;
  IF c.id IS NULL OR c.status='revoked' THEN RAISE EXCEPTION 'INVALID_TOKEN'; END IF;
  IF c.status<>'active' THEN RAISE EXCEPTION 'INTEGRATION_PAUSED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=c.store_id AND is_active) THEN RAISE EXCEPTION 'STORE_INACTIVE'; END IF;
  IF p_envelope->>'protocol_version'<>'1' OR jsonb_typeof(p_envelope->'items')<>'array'
    OR jsonb_array_length(p_envelope->'items')>200 OR octet_length(p_envelope::text)>1048576 THEN RAISE EXCEPTION 'INVALID_PAYLOAD'; END IF;
  SELECT * INTO receipt FROM korset_integration.receipts WHERE integration_id=c.id AND request_id=(p_envelope->>'request_id')::uuid;
  IF receipt.request_id IS NOT NULL THEN
    IF receipt.payload_hash<>p_payload_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    RETURN receipt.result;
  END IF;
  sequence := (p_envelope->>'sequence')::bigint;
  IF sequence<=c.last_sequence THEN RAISE EXCEPTION 'STALE_SEQUENCE'; END IF;
  IF c.source_instance_id IS NOT NULL AND c.source_instance_id<>p_envelope->>'source_instance_id' THEN RAISE EXCEPTION 'SOURCE_INSTANCE_MISMATCH'; END IF;
  PERFORM korset_integration.check_request_budget(c.id);
  snapshot := (p_envelope->>'snapshot_id')::uuid;
  result := jsonb_build_object('applied',0,'unresolved',0,'conflicts',0,'stale',0,'deactivated',0);
  IF p_envelope->>'operation'='snapshot_begin' THEN
    INSERT INTO korset_integration.snapshots(integration_id,id,expected_count,start_sequence) VALUES(c.id,snapshot,(p_envelope->>'expected_count')::integer,sequence);
  ELSIF p_envelope->>'operation'='snapshot_abort' THEN
    UPDATE korset_integration.snapshots SET status='aborted' WHERE integration_id=c.id AND id=snapshot AND status='open';
    IF NOT FOUND THEN RAISE EXCEPTION 'SNAPSHOT_NOT_OPEN'; END IF;
  ELSIF p_envelope->>'operation'='snapshot_complete' THEN
    SELECT * INTO snap FROM korset_integration.snapshots WHERE integration_id=c.id AND id=snapshot AND status='open' FOR UPDATE;
    IF snap.id IS NULL THEN RAISE EXCEPTION 'SNAPSHOT_NOT_OPEN'; END IF;
    SELECT count(*) INTO counted FROM korset_integration.source_items WHERE integration_id=c.id AND snapshot_id=snapshot;
    IF counted<>snap.expected_count THEN RAISE EXCEPTION 'SNAPSHOT_INCOMPLETE'; END IF;
    SELECT count(*),count(*) FILTER(WHERE s.snapshot_id IS DISTINCT FROM snapshot AND s.last_sequence<=snap.start_sequence) INTO total,missing
      FROM korset_integration.source_items s JOIN public.store_products sp ON sp.id=s.store_product_id WHERE s.integration_id=c.id AND sp.is_active;
    IF missing>0 AND (counted=0 OR missing>greatest(10,total/5)) THEN RAISE EXCEPTION 'MASS_DEACTIVATION_BLOCKED'; END IF;
    UPDATE public.store_products sp SET is_active=false,updated_at=now() FROM korset_integration.source_items s
      WHERE s.integration_id=c.id AND s.snapshot_id IS DISTINCT FROM snapshot AND s.last_sequence<=snap.start_sequence
        AND sp.id=s.store_product_id AND sp.sync_integration_id=c.id AND sp.is_active;
    GET DIAGNOSTICS missing=ROW_COUNT;
    result := jsonb_set(result,'{deactivated}',to_jsonb(missing));
    UPDATE korset_integration.snapshots SET status='complete' WHERE integration_id=c.id AND id=snapshot;
  ELSIF p_envelope->>'operation'='upsert' THEN
    IF snapshot IS NOT NULL AND NOT EXISTS(SELECT 1 FROM korset_integration.snapshots WHERE integration_id=c.id AND id=snapshot AND status='open') THEN RAISE EXCEPTION 'SNAPSHOT_NOT_OPEN'; END IF;
    SELECT count(*) INTO source_count FROM korset_integration.source_items WHERE integration_id=c.id;
    FOR e IN SELECT value FROM jsonb_array_elements(p_envelope->'items') LOOP
      SELECT * INTO source_row FROM korset_integration.source_items WHERE integration_id=c.id AND external_id=e->>'external_id' AND variant_id=e->>'variant_id' AND unit_id=e->>'unit_id';
      IF source_row.id IS NOT NULL AND (e->>'revision')::bigint<=source_row.revision THEN
        IF (e->>'revision')::bigint=source_row.revision AND e<>source_row.payload THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
        IF (e->>'revision')::bigint=source_row.revision THEN
          UPDATE korset_integration.source_items SET last_sequence=sequence,updated_at=now() WHERE id=source_row.id;
          IF source_row.resolution_code='MATCHED' THEN verified_same_revision:=verified_same_revision+1; END IF;
        END IF;
        IF snapshot IS NOT NULL THEN UPDATE korset_integration.source_items SET snapshot_id=snapshot WHERE id=source_row.id; END IF;
        result := jsonb_set(result,'{stale}',to_jsonb((result->>'stale')::integer+1));
        CONTINUE;
      END IF;
      IF source_row.id IS NULL THEN
        IF source_count>=100000 THEN RAISE EXCEPTION 'SOURCE_LIMIT_REACHED'; END IF;
        source_count:=source_count+1;
      END IF;
      INSERT INTO korset_integration.source_items(integration_id,external_id,variant_id,unit_id,revision,last_sequence,payload,snapshot_id)
      VALUES(c.id,e->>'external_id',e->>'variant_id',e->>'unit_id',(e->>'revision')::bigint,sequence,e,snapshot)
      ON CONFLICT(integration_id,external_id,variant_id,unit_id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,
        last_sequence=excluded.last_sequence,
        snapshot_id=coalesce(excluded.snapshot_id,korset_integration.source_items.snapshot_id),updated_at=now()
      RETURNING * INTO source_row;
      outcome := korset_integration.project_item(source_row.id,c.store_id);
      result := jsonb_set(result,ARRAY[outcome],to_jsonb((result->>outcome)::integer+1));
    END LOOP;
  ELSIF p_envelope->>'operation'<>'heartbeat' THEN RAISE EXCEPTION 'INVALID_OPERATION'; END IF;
  UPDATE korset_integration.connections SET source_instance_id=p_envelope->>'source_instance_id',last_sequence=sequence,
    connector_version=p_envelope->>'connector_version',last_seen_at=now(),
    last_applied_at=CASE WHEN p_envelope->>'operation'='snapshot_complete'
      OR (p_envelope->>'operation'='upsert' AND ((result->>'applied')::integer>0 OR verified_same_revision>0))
      THEN now() ELSE last_applied_at END,
    last_error_code=CASE WHEN p_envelope->>'operation' IN ('upsert','snapshot_complete') THEN
      CASE WHEN EXISTS(SELECT 1 FROM korset_integration.source_items WHERE integration_id=c.id AND resolution_code<>'MATCHED') THEN 'ITEMS_REQUIRE_REVIEW' ELSE NULL END
      ELSE last_error_code END,
    counters=CASE WHEN p_envelope->>'operation' IN ('upsert','snapshot_complete') THEN result ELSE counters END WHERE id=c.id;
  INSERT INTO korset_integration.receipts(integration_id,request_id,payload_hash,sequence,result) VALUES(c.id,(p_envelope->>'request_id')::uuid,p_payload_hash,sequence,result);
  RETURN result;
END;
$$;

CREATE FUNCTION public.korset_integration_guard_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF coalesce(auth.role(),'') IN ('anon','authenticated') OR current_user IN ('anon','authenticated') THEN
    IF TG_OP='DELETE' AND OLD.sync_integration_id IS NOT NULL THEN RAISE EXCEPTION 'INTEGRATION_MANAGED_FIELDS'; END IF;
    IF TG_OP='INSERT' AND NEW.sync_integration_id IS NOT NULL THEN RAISE EXCEPTION 'INTEGRATION_MANAGED_FIELDS'; END IF;
    IF TG_OP='UPDATE' AND (NEW.sync_integration_id IS DISTINCT FROM OLD.sync_integration_id OR
      (OLD.sync_integration_id IS NOT NULL AND
        (NEW.store_id,NEW.price_kzt,NEW.old_price_kzt,NEW.discount_percent,NEW.stock_status,NEW.is_active,NEW.ean,NEW.global_product_id,NEW.local_name,NEW.local_sku)
        IS DISTINCT FROM (OLD.store_id,OLD.price_kzt,OLD.old_price_kzt,OLD.discount_percent,OLD.stock_status,OLD.is_active,OLD.ean,OLD.global_product_id,OLD.local_name,OLD.local_sku))) THEN RAISE EXCEPTION 'INTEGRATION_MANAGED_FIELDS'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER store_products_integration_guard BEFORE INSERT OR UPDATE OR DELETE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.korset_integration_guard_fields();

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA korset_integration FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.korset_integration_manage(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.korset_integration_resolve(uuid,uuid,uuid,bigint,boolean,integer,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.korset_integration_ingest(text,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.korset_integration_guard_fields() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.korset_integration_manage(uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.korset_integration_resolve(uuid,uuid,uuid,bigint,boolean,integer,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.korset_integration_ingest(text,jsonb,text) TO service_role;

CREATE FUNCTION public.korset_get_store_product_conditions(p_store_id uuid,p_eans text[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_eans IS NULL OR cardinality(p_eans)>500 OR EXISTS(SELECT 1 FROM unnest(p_eans) e WHERE e IS NULL OR length(e)>64) THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND is_active
    AND (is_published OR owner_id=auth.uid())) THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('ean',sp.ean,
    'regular_minor',(s.payload#>>'{price,regular_minor}')::bigint,
    'sale_minor',(s.payload#>>'{price,sale_minor}')::bigint,
    'valid_from',s.payload#>>'{price,valid_from}','valid_until',s.payload#>>'{price,valid_until}',
    'applied_at',s.updated_at,'unit','piece'))
    FROM korset_integration.source_items s JOIN korset_integration.connections c ON c.id=s.integration_id
    JOIN public.store_products sp ON sp.id=s.store_product_id AND sp.sync_integration_id=c.id
    JOIN public.global_products gp ON gp.id=sp.global_product_id AND gp.is_active
    WHERE c.store_id=p_store_id AND c.status IN ('active','paused') AND s.resolution_code='MATCHED'
      AND sp.is_active AND sp.ean=ANY(p_eans)), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.korset_get_store_product_conditions(uuid,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.korset_get_store_product_conditions(uuid,text[]) TO anon,authenticated,service_role;

CREATE FUNCTION public.korset_integration_preview(p_token_hash text,p_envelope jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE c korset_integration.connections; e jsonb; matches integer; target uuid;
  issue text; detail jsonb:='[]'; matched integer:=0; unresolved integer:=0; conflicts integer:=0; seen_targets uuid[]:='{}';
BEGIN
  SELECT * INTO c FROM korset_integration.connections WHERE token_hash=p_token_hash AND status<>'revoked';
  IF c.id IS NULL THEN RAISE EXCEPTION 'INVALID_TOKEN'; END IF;
  IF c.status<>'active' THEN RAISE EXCEPTION 'INTEGRATION_PAUSED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=c.store_id AND is_active) THEN RAISE EXCEPTION 'STORE_INACTIVE'; END IF;
  IF p_envelope->>'operation'<>'dry_run' OR jsonb_typeof(p_envelope->'items')<>'array'
    OR jsonb_array_length(p_envelope->'items') NOT BETWEEN 1 AND 200 OR octet_length(p_envelope::text)>1048576 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;
  PERFORM korset_integration.check_request_budget(c.id);
  FOR e IN SELECT value FROM jsonb_array_elements(p_envelope->'items') LOOP
    SELECT count(DISTINCT id),min(id::text)::uuid INTO matches,target FROM (
      SELECT gp.id FROM jsonb_array_elements(e->'barcodes') bc JOIN public.global_products gp ON gp.ean=bc->>'value'
        WHERE bc->>'kind'='gtin' AND gp.is_active
      UNION SELECT gp.id FROM jsonb_array_elements(e->'barcodes') bc JOIN public.product_ean_aliases a
        ON a.ean=bc->>'value' AND a.status='trusted' AND a.is_active
        JOIN public.global_products gp ON gp.id=a.global_product_id AND gp.is_active WHERE bc->>'kind'='gtin'
    ) candidates;
    issue:=CASE WHEN matches=0 THEN 'UNKNOWN_PRODUCT' WHEN matches>1 THEN 'BARCODE_CONFLICT'
      WHEN e#>>'{price,regular_minor}' IS NULL THEN 'PRICE_MISSING'
      WHEN (e#>>'{price,regular_minor}')::bigint%100<>0 THEN 'PRICE_PRECISION_UNSUPPORTED'
      WHEN e#>>'{stock,quantity}' IS NULL THEN 'STOCK_UNKNOWN'
      WHEN e#>>'{stock,unit}'<>'piece' THEN 'SALE_UNIT_UNSUPPORTED' ELSE NULL END;
    IF issue IS NULL AND (target=ANY(seen_targets) OR EXISTS(SELECT 1 FROM public.store_products sp WHERE sp.store_id=c.store_id
      AND sp.global_product_id=target AND (sp.ean<>(SELECT ean FROM public.global_products WHERE id=target) OR sp.sync_integration_id IS DISTINCT FROM c.id OR EXISTS(
        SELECT 1 FROM korset_integration.source_items s WHERE s.store_product_id=sp.id
          AND (s.external_id,s.variant_id,s.unit_id) IS DISTINCT FROM (e->>'external_id',e->>'variant_id',e->>'unit_id'))))) THEN
      issue:='OWNERSHIP_CONFLICT';
    END IF;
    IF issue IS NULL THEN matched:=matched+1; seen_targets:=array_append(seen_targets,target);
    ELSIF issue='OWNERSHIP_CONFLICT' THEN conflicts:=conflicts+1;
    ELSE unresolved:=unresolved+1; END IF;
    detail:=detail||jsonb_build_array(jsonb_build_object('external_id',e->>'external_id','code',coalesce(issue,'MATCHED')));
  END LOOP;
  RETURN jsonb_build_object('dry_run',true,'applied',0,'matched',matched,'unresolved',unresolved,'conflicts',conflicts,'stale',0,'items',detail);
END;
$$;
REVOKE ALL ON FUNCTION public.korset_integration_preview(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.korset_integration_preview(text,jsonb) TO service_role;

COMMIT;
