import test from 'node:test'
import assert from 'node:assert/strict'
import { getCoverage, collectIntegrationIssues } from '../../src/domain/retail/integrationReport.js'

test('coverage uses the complete source cohort and handles an empty assortment',()=>{
  assert.deepEqual(getCoverage({total:200,matched:140}),{total:200,matched:140,remaining:60,percent:70})
  assert.deepEqual(getCoverage({total:0,matched:0}),{total:0,matched:0,remaining:0,percent:0})
})

test('queue export follows every page and preserves barcode strings and raw invalid values',async()=>{
  const pages=[{items:[{source_id:'a',barcodes:[{value:'0012345',kind:'local'}]}],next_cursor:'a',total:2},
    {items:[{source_id:'b',barcodes:[{value:123,kind:'gtin'}]}],next_cursor:null,total:2}]
  const cursors=[]
  const result=await collectIntegrationIssues(async(cursor)=>{cursors.push(cursor);return pages.shift()})
  assert.deepEqual(cursors,[null,'a']);assert.equal(result.length,2)
  assert.equal(result[0].barcodes[0].value,'0012345');assert.equal(result[1].barcodes[0].value,123)
})

test('queue export fails on repeated cursors instead of returning an incomplete result',async()=>{
  await assert.rejects(collectIntegrationIssues(async()=>({items:[{source_id:'a'}],next_cursor:'a'})),/INVALID_PAGE/)
})

test('queue export refuses to mix pages from different exchange generations',async()=>{
  const pages=[{items:[{source_id:'a'}],next_cursor:'a',generation:'first'},
    {items:[{source_id:'b'}],next_cursor:null,generation:'second'}]
  await assert.rejects(collectIntegrationIssues(async()=>pages.shift()),/QUEUE_CHANGED/)
})
