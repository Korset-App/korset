import { spawn } from 'node:child_process'

const child=spawn(process.execPath,['--test','tests/integration/integrationDatabase.test.mjs'],
  {stdio:'inherit',env:{...process.env,KORSET_LARGE_CATALOG_TEST:'true'}})
child.on('error',error=>{console.error(error.message);process.exitCode=1})
child.on('exit',code=>{process.exitCode=code??1})
