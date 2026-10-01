import { createClient } from '@supabase/supabase-js'
import { createDeadlineFetch } from './deadlineFetch.js'
import { IntegrationError, MAX_BODY_BYTES, normalizeEnvelope, envelopeHash, issueConnectorToken, tokenHash } from './protocol.js'

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const ACTIONS = new Set(['create','rotate','pause','resume','revoke'])
const DB_ERRORS = { INVALID_TOKEN:401, INTEGRATION_PAUSED:403, NOT_STORE_OWNER:403,
  STORE_INACTIVE:403, INTEGRATION_NOT_ACTIVE:409, SOURCE_NOT_FOUND:404, OWNERSHIP_CONFLICT:409, RESOLUTION_UNSAFE:409,
  INTEGRATION_REVOKED:409, INTEGRATION_EXISTS:409, INTEGRATION_NOT_FOUND:404,
  IDEMPOTENCY_CONFLICT:409, STALE_SEQUENCE:409, SOURCE_INSTANCE_MISMATCH:409,
  SNAPSHOT_NOT_OPEN:409, SNAPSHOT_INCOMPLETE:409, MASS_DEACTIVATION_BLOCKED:409,
  REVISION_CONFLICT:409, SOURCE_LIMIT_REACHED:409, RATE_LIMITED:429, INVALID_PAYLOAD:400, INVALID_OPERATION:400, INVALID_ACTION:400 }

function serverClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new IntegrationError('NOT_INSTALLED',501)
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},
    global:{fetch:createDeadlineFetch()}})
}

async function body(req) {
  const type = String(req.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase()
  if (type !== 'application/json') throw new IntegrationError('JSON_REQUIRED',415)
  const length = req.headers?.['content-length']
  if (length != null && (!/^\d+$/.test(String(length)) || Number(length)>MAX_BODY_BYTES)) throw new IntegrationError('BODY_TOO_LARGE',413)
  let value = req.body
  if (value === undefined && req[Symbol.asyncIterator]) {
    const chunks=[]; let bytes=0
    for await (const chunk of req) {
      bytes+=Buffer.byteLength(chunk)
      if(bytes>MAX_BODY_BYTES)throw new IntegrationError('BODY_TOO_LARGE',413)
      chunks.push(Buffer.from(chunk))
    }
    value=Buffer.concat(chunks).toString('utf8')
  }
  const serialized=typeof value==='string' ? value : JSON.stringify(value)
  if(!serialized)throw new IntegrationError('INVALID_JSON')
  if(Buffer.byteLength(serialized)>MAX_BODY_BYTES)throw new IntegrationError('BODY_TOO_LARGE',413)
  if(typeof value==='string') {
    try { value=JSON.parse(value) } catch { throw new IntegrationError('INVALID_JSON') }
  }
  if(!value || Array.isArray(value) || typeof value!=='object')throw new IntegrationError('INVALID_JSON')
  return value
}

async function rpc(client,name,args) {
  const {data,error}=await client.rpc(name,args)
  if(error) {
    if(['PGRST202','PGRST204','42P01','42883'].includes(error.code))throw new IntegrationError('SCHEMA_NOT_READY',501)
    for(const [code,status] of Object.entries(DB_ERRORS))if(String(error.message||'').includes(code))throw new IntegrationError(code,status)
    if(error.code==='23505')throw new IntegrationError('STATE_CONFLICT',409)
    throw new IntegrationError('INTEGRATION_UNAVAILABLE',503)
  }
  if(data==null)throw new IntegrationError('INTEGRATION_UNAVAILABLE',503)
  return data
}

export function createIntegrationHandler({enabled=()=>process.env.KORSET_INTEGRATION_ENABLED==='true',clientFactory=serverClient,
  eventLogger=(event)=>console.info(JSON.stringify(event))}={}) {
  return async function integrationHandler(req,res) {
    const started=Date.now(); let requestId=null; let operation=null; let failure=null
    res.setHeader('Cache-Control','no-store')
    res.setHeader('X-Content-Type-Options','nosniff')
    try {
      if(!(typeof enabled==='function'?enabled():enabled))throw new IntegrationError('NOT_INSTALLED',501)
      if(!['GET','POST'].includes(req.method)) {
        res.setHeader('Allow','GET, POST');throw new IntegrationError('METHOD_NOT_ALLOWED',405)
      }
      const authorization=req.headers?.authorization
      if(typeof authorization!=='string' || !/^Bearer \S+$/.test(authorization) || authorization.length>8192)throw new IntegrationError('AUTH_REQUIRED',401)
      const bearer=authorization.slice(7)
      const client=clientFactory()
      if(bearer.startsWith('krt1_')) {
        if(req.method!=='POST')throw new IntegrationError('METHOD_NOT_ALLOWED',405)
        let verificationHash
        try { verificationHash=tokenHash(bearer) } catch { throw new IntegrationError('INVALID_TOKEN',401) }
        const normalized=normalizeEnvelope(await body(req))
        requestId=normalized.request_id;operation=normalized.operation
        const preview=normalized.operation==='dry_run'
        const result=await rpc(client,preview?'korset_integration_preview':'korset_integration_ingest',
          {p_token_hash:verificationHash,p_envelope:normalized,...(preview?{}:{p_payload_hash:envelopeHash(normalized)})})
        return res.status(200).json({protocol_version:1,request_id:normalized.request_id,result})
      }
      const {data,error}=await client.auth.getUser(bearer)
      if(error || !data?.user?.id)throw new IntegrationError('AUTH_REQUIRED',401)
      const payload=req.method==='GET' ? {action:'status',store_id:req.query?.store_id} : await body(req)
      const resolving=payload.action==='resolve' && req.method==='POST'
      const allowed=resolving
        ? ['action','store_id','source_id','expected_revision','adopt','expected_manual_price','expected_manual_updated_at']
        : ['action','store_id']
      if(Object.keys(payload).some((key)=>!allowed.includes(key)) || !UUID.test(String(payload.store_id||''))
        || (req.method==='POST' && !resolving && !ACTIONS.has(payload.action)))throw new IntegrationError('INVALID_ACTION')
      if(resolving && (!UUID.test(String(payload.source_id||'')) || !Number.isSafeInteger(payload.expected_revision)
        || payload.expected_revision<1 || typeof payload.adopt!=='boolean'
        || (payload.adopt && (payload.expected_manual_price!==null
          && (!Number.isSafeInteger(payload.expected_manual_price) || payload.expected_manual_price<1)
          || typeof payload.expected_manual_updated_at!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(payload.expected_manual_updated_at)
          || Number.isNaN(Date.parse(payload.expected_manual_updated_at))))
        || (!payload.adopt && (payload.expected_manual_price!==null || payload.expected_manual_updated_at!==null))))throw new IntegrationError('INVALID_ACTION')
      const secret=['create','rotate'].includes(payload.action)?issueConnectorToken():null
      operation=payload.action
      const result=resolving
        ? await rpc(client,'korset_integration_resolve',{p_owner_id:data.user.id,p_store_id:payload.store_id,
          p_source_id:payload.source_id,p_expected_revision:payload.expected_revision,p_adopt:payload.adopt,
          p_expected_manual_price:payload.expected_manual_price,p_expected_manual_updated_at:payload.expected_manual_updated_at})
        : await rpc(client,'korset_integration_manage',{p_owner_id:data.user.id,p_store_id:payload.store_id,
          p_action:payload.action,p_token_hash:secret?tokenHash(secret):null})
      return res.status(200).json(secret?{...result,token:secret}:result)
    } catch(error) {
      const known=error instanceof IntegrationError
      const status=known?error.status:503
      failure=known?error.code:'INTEGRATION_UNAVAILABLE'
      if(status===429)res.setHeader('Retry-After','30')
      return res.status(status).json({error:known?error.code:'INTEGRATION_UNAVAILABLE'})
    } finally {
      try { eventLogger({event:'korset.integration.request',request_id:requestId,operation,
        status:res.statusCode,duration_ms:Date.now()-started,error:failure}) } catch { /* Logging cannot change a committed acknowledgement. */ }
    }
  }
}
