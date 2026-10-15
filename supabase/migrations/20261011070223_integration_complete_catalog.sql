BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE korset_integration.source_items
  ADD COLUMN is_present boolean NOT NULL DEFAULT true,
  ADD COLUMN matched_global_product_id uuid REFERENCES public.global_products(id);
ALTER TABLE korset_integration.snapshots
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN report jsonb;
CREATE INDEX integration_present_items_idx ON korset_integration.source_items(integration_id,id) WHERE is_present;
CREATE FUNCTION korset_integration.restore_source_presence()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.revision>=OLD.revision AND NEW.last_sequence>OLD.last_sequence THEN NEW.is_present:=true; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER integration_source_presence BEFORE UPDATE OF revision,last_sequence ON korset_integration.source_items
  FOR EACH ROW EXECUTE FUNCTION korset_integration.restore_source_presence();
UPDATE korset_integration.source_items s SET matched_global_product_id=sp.global_product_id
  FROM public.store_products sp WHERE sp.id=s.store_product_id AND s.resolution_code='MATCHED';

CREATE FUNCTION korset_integration.item_issues(p_item jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT ARRAY(SELECT DISTINCT code FROM (
    SELECT jsonb_array_elements_text(coalesce(p_item->'validation_issues','[]'::jsonb)) AS code
    UNION ALL SELECT 'PRICE_MISSING' WHERE p_item#>>'{price,regular_minor}' IS NULL
    UNION ALL SELECT 'STOCK_UNKNOWN' WHERE p_item#>>'{stock,quantity}' IS NULL
    UNION ALL SELECT 'SALE_UNIT_UNSUPPORTED' WHERE p_item#>>'{stock,unit}' NOT IN ('piece','kg','g','l','ml')
  ) issues ORDER BY code);
$$;

CREATE FUNCTION korset_integration.source_card_visible(p_row korset_integration.source_items)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT p_row.is_present AND coalesce((p_row.payload->>'active')::boolean,false)
    AND p_row.payload->>'data_version'='2'
    AND length(coalesce(p_row.payload->>'name',''))>0
    AND p_row.payload#>>'{stock,unit}' IN ('piece','kg','g','l','ml')
    AND p_row.resolution_code NOT IN ('OWNERSHIP_CONFLICT','BARCODE_CONFLICT')
    AND p_row.store_product_id IS NULL;
$$;

CREATE FUNCTION korset_integration.catalog_report(p_integration_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT jsonb_build_object(
    'total',count(*),
    'matched',count(*) FILTER(WHERE s.matched_global_product_id IS NOT NULL),
    'needs_enrichment',count(*) FILTER(WHERE s.matched_global_product_id IS NULL),
    'published',count(*) FILTER(WHERE (sp.is_active AND sp.sync_integration_id=s.integration_id) OR korset_integration.source_card_visible(s)),
    'needs_review',count(*) FILTER(WHERE s.resolution_code<>'MATCHED' OR cardinality(korset_integration.item_issues(s.payload))>0),
    'price_missing',count(*) FILTER(WHERE s.payload#>>'{price,regular_minor}' IS NULL),
    'stock_unknown',count(*) FILTER(WHERE s.payload#>>'{stock,quantity}' IS NULL),
    'in_stock',count(*) FILTER(WHERE (s.payload#>>'{stock,quantity}')::numeric>0),
    'out_of_stock',count(*) FILTER(WHERE (s.payload#>>'{stock,quantity}')::numeric<=0),
    'weighted',count(*) FILTER(WHERE s.payload#>>'{stock,unit}' IN ('kg','g','l','ml')),
    'own_production',count(*) FILTER(WHERE s.payload->>'item_kind'='own_production'),
    'conflicts',count(*) FILTER(WHERE s.resolution_code IN ('OWNERSHIP_CONFLICT','BARCODE_CONFLICT')),
    'invalid_data',count(*) FILTER(WHERE cardinality(coalesce(ARRAY(SELECT jsonb_array_elements_text(s.payload->'validation_issues')),ARRAY[]::text[]))>0))
  FROM korset_integration.source_items s LEFT JOIN public.store_products sp ON sp.id=s.store_product_id
  WHERE s.integration_id=p_integration_id AND s.is_present AND (s.payload->>'active')::boolean;
$$;

CREATE OR REPLACE FUNCTION korset_integration.summary(p_connection korset_integration.connections)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT jsonb_build_object('id',p_connection.id,'status',p_connection.status,'source_kind',p_connection.source_kind,
    'connector_version',p_connection.connector_version,'last_seen_at',p_connection.last_seen_at,
    'last_applied_at',p_connection.last_applied_at,'last_error_code',p_connection.last_error_code,'counters',p_connection.counters,
    'report',korset_integration.catalog_report(p_connection.id),
    'last_snapshot',(SELECT jsonb_build_object('id',sn.id,'status',sn.status,'expected_count',sn.expected_count,
       'started_at',sn.started_at,'completed_at',sn.completed_at,'report',sn.report)
       FROM korset_integration.snapshots sn WHERE sn.integration_id=p_connection.id ORDER BY sn.started_at DESC,sn.start_sequence DESC LIMIT 1));
$$;

CREATE FUNCTION korset_integration.assess_item(p_integration_id uuid,p_store_id uuid,p_item jsonb,p_source_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE candidate_id uuid; candidate_count integer; target public.store_products;
  code text; errors text[]; mode text:='legacy';
BEGIN
  SELECT count(DISTINCT id),min(id::text)::uuid INTO candidate_count,candidate_id FROM (
    SELECT gp.id FROM jsonb_array_elements(p_item->'barcodes') bc JOIN public.global_products gp ON gp.ean=bc->>'value'
      WHERE bc->>'kind'='gtin' AND gp.is_active
    UNION SELECT a.global_product_id FROM jsonb_array_elements(p_item->'barcodes') bc
      JOIN public.product_ean_aliases a ON a.ean=bc->>'value' AND a.status='trusted' AND a.is_active
      JOIN public.global_products gp ON gp.id=a.global_product_id AND gp.is_active WHERE bc->>'kind'='gtin'
  ) candidates;
  errors:=korset_integration.item_issues(p_item);
  IF candidate_count>1 THEN code:='BARCODE_CONFLICT'; mode:='quarantine';
  ELSIF p_item->>'data_version' IS DISTINCT FROM '2' THEN
    code:=CASE WHEN candidate_count=0 THEN 'UNKNOWN_PRODUCT'
      WHEN p_item#>>'{price,regular_minor}' IS NULL THEN 'PRICE_MISSING'
      WHEN (p_item#>>'{price,regular_minor}')::bigint%100<>0 THEN 'PRICE_PRECISION_UNSUPPORTED'
      WHEN p_item#>>'{stock,quantity}' IS NULL THEN 'STOCK_UNKNOWN'
      WHEN p_item#>>'{stock,unit}'<>'piece' THEN 'SALE_UNIT_UNSUPPORTED' END;
    IF code IS NOT NULL THEN mode:='quarantine'; END IF;
  ELSE
    mode:='source';
    IF candidate_count=1 AND cardinality(errors)=0 AND p_item#>>'{stock,unit}'='piece'
      AND (p_item#>>'{price,regular_minor}')::bigint%100=0 THEN mode:='legacy'; END IF;
    IF candidate_count=0 OR errors&&ARRAY['INVALID_BARCODE','DUPLICATE_BARCODE','LOCAL_BARCODE_REQUIRED'] THEN
      candidate_id:=NULL; code:='UNKNOWN_PRODUCT';
    END IF;
  END IF;
  IF mode<>'quarantine' THEN
    SELECT sp.* INTO target FROM public.store_products sp WHERE sp.store_id=p_store_id
      AND (sp.global_product_id=candidate_id OR sp.ean=(SELECT ean FROM public.global_products WHERE id=candidate_id)
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_item->'barcodes') bc WHERE bc->>'kind'='gtin' AND sp.ean=bc->>'value'))
      ORDER BY sp.id LIMIT 1;
    IF target.id IS NOT NULL AND (target.sync_integration_id IS DISTINCT FROM p_integration_id
      OR EXISTS(SELECT 1 FROM korset_integration.source_items other WHERE other.store_product_id=target.id AND other.id IS DISTINCT FROM p_source_id)
      OR (candidate_id IS NOT NULL AND target.global_product_id=candidate_id AND target.ean<>(SELECT ean FROM public.global_products WHERE id=candidate_id))) THEN
      code:='OWNERSHIP_CONFLICT';mode:='quarantine';
    END IF;
  END IF;
  RETURN jsonb_build_object('code',coalesce(code,'MATCHED'),'projection',mode,'global_id',CASE WHEN candidate_count=1 THEN candidate_id END,
    'target_id',target.id,'issues',errors);
END;
$$;

ALTER FUNCTION korset_integration.project_item(uuid,uuid) RENAME TO project_item_legacy;
CREATE FUNCTION korset_integration.project_item(p_item_id uuid,p_store_id uuid)
RETURNS text LANGUAGE plpgsql SET search_path='' AS $$
DECLARE s korset_integration.source_items; assessment jsonb;
BEGIN
  SELECT * INTO STRICT s FROM korset_integration.source_items WHERE id=p_item_id;
  assessment:=korset_integration.assess_item(s.integration_id,p_store_id,s.payload,s.id);
  UPDATE korset_integration.source_items SET matched_global_product_id=(assessment->>'global_id')::uuid WHERE id=s.id;
  IF s.payload->>'data_version' IS DISTINCT FROM '2' THEN RETURN korset_integration.project_item_legacy(p_item_id,p_store_id); END IF;
  IF assessment->>'projection'='quarantine' THEN
    UPDATE public.store_products SET is_active=false,updated_at=now() WHERE id=s.store_product_id AND sync_integration_id=s.integration_id;
    UPDATE korset_integration.source_items SET resolution_code=assessment->>'code' WHERE id=s.id;
    RETURN 'conflicts';
  END IF;
  IF assessment->>'projection'='legacy' THEN
    RETURN korset_integration.project_item_legacy(p_item_id,p_store_id);
  END IF;
  IF s.store_product_id IS NOT NULL THEN
    UPDATE public.store_products SET is_active=false,updated_at=now() WHERE id=s.store_product_id AND sync_integration_id=s.integration_id;
  END IF;
  UPDATE korset_integration.source_items SET store_product_id=NULL,
    resolution_code=assessment->>'code'
    WHERE id=s.id RETURNING * INTO s;
  RETURN CASE WHEN korset_integration.source_card_visible(s) THEN 'applied' ELSE 'unresolved' END;
END;
$$;

ALTER FUNCTION public.korset_integration_ingest(text,jsonb,text) RENAME TO korset_integration_ingest_legacy;
REVOKE ALL ON FUNCTION public.korset_integration_ingest_legacy(text,jsonb,text) FROM service_role;
CREATE FUNCTION public.korset_integration_ingest(p_token_hash text,p_envelope jsonb,p_payload_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c korset_integration.connections; answer jsonb; snap korset_integration.snapshots; already_committed boolean;
  total_published integer; missing_published integer; missing_source integer;
BEGIN
  IF p_envelope->>'protocol_version' NOT IN ('1','2') THEN RAISE EXCEPTION 'INVALID_PAYLOAD'; END IF;
  SELECT * INTO c FROM korset_integration.connections WHERE token_hash=p_token_hash FOR UPDATE;
  SELECT EXISTS(SELECT 1 FROM korset_integration.receipts WHERE integration_id=c.id AND request_id=(p_envelope->>'request_id')::uuid) INTO already_committed;
  IF NOT already_committed AND p_envelope->>'operation'='snapshot_complete' THEN
    SELECT * INTO snap FROM korset_integration.snapshots WHERE integration_id=c.id AND id=(p_envelope->>'snapshot_id')::uuid AND status='open';
    SELECT count(*),count(*) FILTER(WHERE s.snapshot_id IS DISTINCT FROM snap.id AND s.last_sequence<=snap.start_sequence),
      count(*) FILTER(WHERE s.snapshot_id IS DISTINCT FROM snap.id AND s.last_sequence<=snap.start_sequence AND korset_integration.source_card_visible(s))
      INTO total_published,missing_published,missing_source
      FROM korset_integration.source_items s LEFT JOIN public.store_products sp ON sp.id=s.store_product_id
      WHERE s.integration_id=c.id AND s.is_present AND (korset_integration.source_card_visible(s) OR (sp.is_active AND sp.sync_integration_id=c.id));
    IF missing_published>0 AND (snap.expected_count=0 OR missing_published>greatest(10,total_published/5)) THEN RAISE EXCEPTION 'MASS_DEACTIVATION_BLOCKED'; END IF;
  END IF;
  answer:=public.korset_integration_ingest_legacy(p_token_hash,p_envelope||jsonb_build_object('protocol_version',1),p_payload_hash);
  IF already_committed THEN RETURN answer; END IF;
  SELECT * INTO STRICT c FROM korset_integration.connections WHERE token_hash=p_token_hash FOR UPDATE;
  IF p_envelope->>'operation'='upsert' THEN
    UPDATE korset_integration.source_items s SET is_present=true WHERE s.integration_id=c.id
      AND s.last_sequence=(p_envelope->>'sequence')::bigint;
  ELSIF p_envelope->>'operation'='snapshot_complete' THEN
    SELECT * INTO STRICT snap FROM korset_integration.snapshots WHERE integration_id=c.id AND id=(p_envelope->>'snapshot_id')::uuid;
    UPDATE korset_integration.source_items SET is_present=false WHERE integration_id=c.id
      AND snapshot_id IS DISTINCT FROM snap.id AND last_sequence<=snap.start_sequence;
    UPDATE korset_integration.snapshots SET completed_at=coalesce(completed_at,now()),report=coalesce(report,korset_integration.catalog_report(c.id))
      WHERE integration_id=c.id AND id=snap.id;
    answer:=jsonb_set(answer,'{deactivated}',to_jsonb((answer->>'deactivated')::integer+coalesce(missing_source,0)));
    UPDATE korset_integration.receipts SET result=answer WHERE integration_id=c.id AND request_id=(p_envelope->>'request_id')::uuid;
    UPDATE korset_integration.connections SET counters=answer WHERE id=c.id;
  END IF;
  RETURN answer;
END;
$$;
REVOKE ALL ON FUNCTION public.korset_integration_ingest(text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.korset_integration_ingest(text,jsonb,text) TO service_role;

ALTER FUNCTION public.korset_integration_preview(text,jsonb) RENAME TO korset_integration_preview_legacy;
REVOKE ALL ON FUNCTION public.korset_integration_preview_legacy(text,jsonb) FROM service_role;
CREATE FUNCTION public.korset_integration_preview(p_token_hash text,p_envelope jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c korset_integration.connections; detail jsonb:='[]'; source_payload jsonb; assessment jsonb;
  source_id uuid; seen_targets uuid[]:='{}'; matched integer:=0; unresolved integer:=0; conflicts integer:=0; publishable integer:=0;
BEGIN
  SELECT * INTO c FROM korset_integration.connections WHERE token_hash=p_token_hash AND status<>'revoked';
  IF c.id IS NULL THEN RAISE EXCEPTION 'INVALID_TOKEN'; END IF;
  IF c.status<>'active' THEN RAISE EXCEPTION 'INTEGRATION_PAUSED'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=c.store_id AND is_active) THEN RAISE EXCEPTION 'STORE_INACTIVE'; END IF;
  IF p_envelope->>'operation'<>'dry_run' OR p_envelope->>'protocol_version' NOT IN ('1','2') OR jsonb_typeof(p_envelope->'items')<>'array'
    OR jsonb_array_length(p_envelope->'items') NOT BETWEEN 1 AND 200 OR octet_length(p_envelope::text)>1048576 THEN RAISE EXCEPTION 'INVALID_PAYLOAD'; END IF;
  PERFORM korset_integration.check_request_budget(c.id);
  FOR source_payload IN SELECT value FROM jsonb_array_elements(p_envelope->'items') LOOP
    SELECT id INTO source_id FROM korset_integration.source_items WHERE integration_id=c.id
      AND (external_id,variant_id,unit_id)=(source_payload->>'external_id',source_payload->>'variant_id',source_payload->>'unit_id');
    assessment:=korset_integration.assess_item(c.id,c.store_id,source_payload,source_id);
    IF assessment->>'projection'='legacy' AND (assessment->>'global_id')::uuid=ANY(seen_targets) THEN
      assessment:=assessment||jsonb_build_object('code','OWNERSHIP_CONFLICT','projection','quarantine');
    END IF;
    IF assessment->>'code' IN ('OWNERSHIP_CONFLICT','BARCODE_CONFLICT') THEN conflicts:=conflicts+1;
    ELSIF assessment->>'code'='MATCHED' THEN matched:=matched+1;
    ELSE unresolved:=unresolved+1; END IF;
    IF assessment->>'projection'='legacy' THEN
      seen_targets:=array_append(seen_targets,(assessment->>'global_id')::uuid);publishable:=publishable+1;
    ELSIF assessment->>'projection'='source' AND length(source_payload->>'name')>0
      AND source_payload#>>'{stock,unit}' IN ('piece','kg','g','l','ml') THEN publishable:=publishable+1; END IF;
    detail:=detail||jsonb_build_array(jsonb_build_object('external_id',source_payload->>'external_id',
      'variant_id',source_payload->>'variant_id','unit_id',source_payload->>'unit_id','code',assessment->>'code','issues',assessment->'issues'));
  END LOOP;
  RETURN jsonb_build_object('dry_run',true,'applied',0,'matched',matched,'unresolved',unresolved,'conflicts',conflicts,'stale',0,'publishable',publishable,'items',detail);
END;
$$;
REVOKE ALL ON FUNCTION public.korset_integration_preview(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.korset_integration_preview(text,jsonb) TO service_role;

CREATE FUNCTION public.korset_integration_issues(p_owner_id uuid,p_store_id uuid,p_after_id uuid DEFAULT NULL,p_limit integer DEFAULT 50,p_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c korset_integration.connections; rows_json jsonb; row_count integer; total_count integer; last_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND owner_id=p_owner_id AND is_active) THEN RAISE EXCEPTION 'NOT_STORE_OWNER'; END IF;
  SELECT * INTO c FROM korset_integration.connections WHERE store_id=p_store_id ORDER BY (status<>'revoked') DESC,created_at DESC LIMIT 1;
  SELECT count(*) INTO total_count FROM korset_integration.source_items s WHERE integration_id=c.id AND is_present
    AND (resolution_code<>'MATCHED' OR cardinality(korset_integration.item_issues(payload))>0)
    AND (p_code IS NULL OR resolution_code=p_code OR p_code=ANY(korset_integration.item_issues(payload)));
  WITH page AS (
    SELECT s.*,target.price_kzt AS target_price_kzt,target.updated_at AS target_updated_at FROM korset_integration.source_items s
      LEFT JOIN public.store_products target ON target.id=(korset_integration.assess_item(c.id,p_store_id,s.payload,s.id)->>'target_id')::uuid
      WHERE integration_id=c.id AND is_present
      AND (resolution_code<>'MATCHED' OR cardinality(korset_integration.item_issues(payload))>0)
      AND (p_code IS NULL OR resolution_code=p_code OR p_code=ANY(korset_integration.item_issues(payload)))
      AND (p_after_id IS NULL OR s.id>p_after_id) ORDER BY s.id LIMIT least(greatest(coalesce(p_limit,50),1),100)
  ) SELECT count(*),max(id::text)::uuid,coalesce(jsonb_agg(jsonb_build_object(
    'source_id',id,'external_id',external_id,'variant_id',variant_id,'unit_id',unit_id,'name',payload->>'name',
    'code',resolution_code,'issues',korset_integration.item_issues(payload),'revision',revision,
    'barcodes',coalesce(payload#>'{raw_values,barcodes}',payload->'barcodes'),
    'source_regular_minor',(payload#>>'{price,regular_minor}')::bigint,'currency',payload->>'currency',
    'source_stock_quantity',payload#>>'{stock,quantity}','sale_unit',payload#>>'{stock,unit}',
    'raw_price',payload#>'{raw_values,price}','raw_stock',payload#>'{raw_values,stock}','raw_currency',payload#>'{raw_values,currency}',
    'observed_at',payload->>'observed_at','updated_at',updated_at,
    'target_price_kzt',target_price_kzt,'target_updated_at',target_updated_at) ORDER BY id),'[]'::jsonb)
    INTO row_count,last_id,rows_json FROM page;
  RETURN jsonb_build_object('items',rows_json,'total',total_count,
    'generation',(SELECT id::text||':'||xmin::text FROM korset_integration.connections WHERE id=c.id),
    'next_cursor',CASE WHEN row_count=least(greatest(coalesce(p_limit,50),1),100) THEN last_id END);
END;
$$;
REVOKE ALL ON FUNCTION public.korset_integration_issues(uuid,uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.korset_integration_issues(uuid,uuid,uuid,integer,text) TO service_role;

CREATE FUNCTION public.korset_get_store_source_cards(p_store_id uuid,p_after_id uuid DEFAULT NULL,p_limit integer DEFAULT 100,
  p_include_out_of_stock boolean DEFAULT false,p_source_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND is_active AND (is_published OR owner_id=auth.uid())) THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((SELECT jsonb_agg(card ORDER BY source_id) FROM (
    SELECT s.id AS source_id,jsonb_build_object('store_source_item_id',s.id,'store_id',p_store_id,
      'ean',(SELECT bc->>'value' FROM jsonb_array_elements(s.payload->'barcodes') bc WHERE bc->>'kind'='gtin'
        AND NOT korset_integration.item_issues(s.payload)&&ARRAY['INVALID_BARCODE','DUPLICATE_BARCODE','LOCAL_BARCODE_REQUIRED'] LIMIT 1),
      'name',coalesce(nullif(to_jsonb(gp)->>'name',''),s.payload->>'name'),
      'global_product',CASE WHEN gp.id IS NULL THEN NULL ELSE jsonb_build_object('id',gp.id,'ean',gp.ean,
        'name',to_jsonb(gp)->'name','name_kz',to_jsonb(gp)->'name_kz','brand',to_jsonb(gp)->'brand',
        'category',to_jsonb(gp)->'category','image_url',to_jsonb(gp)->'image_url','ingredients_raw',to_jsonb(gp)->'ingredients_raw',
        'allergens_json',to_jsonb(gp)->'allergens_json','diet_tags_json',to_jsonb(gp)->'diet_tags_json',
        'halal_status',to_jsonb(gp)->'halal_status','nutriments_json',to_jsonb(gp)->'nutriments_json') END,
      'regular_minor',(s.payload#>>'{price,regular_minor}')::bigint,'sale_minor',(s.payload#>>'{price,sale_minor}')::bigint,
      'valid_from',s.payload#>>'{price,valid_from}','valid_until',s.payload#>>'{price,valid_until}',
      'unit',s.payload#>>'{stock,unit}','observed_at',s.payload->>'observed_at','item_kind',s.payload->>'item_kind',
      'stock_status',CASE WHEN s.payload#>>'{stock,quantity}' IS NULL THEN 'unknown'
        WHEN (s.payload#>>'{stock,quantity}')::numeric<=0 THEN 'out_of_stock' ELSE 'in_stock' END,
      'needs_enrichment',gp.id IS NULL OR nullif(to_jsonb(gp)->>'ingredients_raw','') IS NULL) AS card
    FROM korset_integration.source_items s JOIN korset_integration.connections c ON c.id=s.integration_id
    LEFT JOIN public.global_products gp ON gp.id=s.matched_global_product_id AND gp.is_active
    WHERE c.store_id=p_store_id AND c.status IN ('active','paused') AND korset_integration.source_card_visible(s)
      AND (p_source_id IS NULL OR s.id=p_source_id) AND (p_after_id IS NULL OR s.id>p_after_id)
      AND (p_include_out_of_stock OR s.payload#>>'{stock,quantity}' IS NULL OR (s.payload#>>'{stock,quantity}')::numeric>0)
    ORDER BY s.id LIMIT least(greatest(coalesce(p_limit,100),1),500)
  ) page),'[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.korset_get_store_source_cards(uuid,uuid,integer,boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.korset_get_store_source_cards(uuid,uuid,integer,boolean,uuid) TO anon,authenticated,service_role;
CREATE FUNCTION public.korset_find_store_source_card(p_store_id uuid,p_barcode text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE matched_id uuid; matched_count integer;
BEGIN
  IF p_barcode IS NULL OR length(p_barcode) NOT BETWEEN 1 AND 64 THEN RETURN '[]'::jsonb; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND is_active AND (is_published OR owner_id=auth.uid())) THEN RETURN '[]'::jsonb; END IF;
  SELECT count(*),min(s.id::text)::uuid INTO matched_count,matched_id FROM korset_integration.source_items s
    JOIN korset_integration.connections c ON c.id=s.integration_id
    WHERE c.store_id=p_store_id AND c.status IN ('active','paused') AND korset_integration.source_card_visible(s)
      AND NOT korset_integration.item_issues(s.payload)&&ARRAY['INVALID_BARCODE','DUPLICATE_BARCODE','LOCAL_BARCODE_REQUIRED']
      AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.payload->'barcodes') bc WHERE bc->>'value'=p_barcode);
  IF matched_count<>1 THEN RETURN '[]'::jsonb; END IF;
  RETURN public.korset_get_store_source_cards(p_store_id,NULL,1,true,matched_id);
END;
$$;
REVOKE ALL ON FUNCTION public.korset_find_store_source_card(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.korset_find_store_source_card(uuid,text) TO anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA korset_integration FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.korset_get_store_product_conditions(p_store_id uuid,p_eans text[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_eans IS NULL OR cardinality(p_eans)>500 OR EXISTS(SELECT 1 FROM unnest(p_eans) e WHERE e IS NULL OR length(e)>64) THEN RAISE EXCEPTION 'INVALID_PAYLOAD'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND is_active AND (is_published OR owner_id=auth.uid())) THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('ean',sp.ean,
    'regular_minor',(s.payload#>>'{price,regular_minor}')::bigint,'sale_minor',(s.payload#>>'{price,sale_minor}')::bigint,
    'valid_from',s.payload#>>'{price,valid_from}','valid_until',s.payload#>>'{price,valid_until}',
    'observed_at',CASE WHEN s.payload->>'data_version'='2' THEN s.payload->>'observed_at' ELSE s.updated_at::text END,
    'applied_at',s.updated_at,'unit','piece'))
    FROM korset_integration.source_items s JOIN korset_integration.connections c ON c.id=s.integration_id
    JOIN public.store_products sp ON sp.id=s.store_product_id AND sp.sync_integration_id=c.id
    JOIN public.global_products gp ON gp.id=sp.global_product_id AND gp.is_active
    WHERE c.store_id=p_store_id AND c.status IN ('active','paused') AND s.is_present AND s.resolution_code='MATCHED'
      AND sp.is_active AND sp.ean=ANY(p_eans)),'[]'::jsonb);
END;
$$;

COMMIT;
