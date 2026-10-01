import { spawn } from 'node:child_process'

const child=spawn(process.execPath,['--test','tests/integration/integrationBrowser.test.mjs'],
  {stdio:'inherit',env:{...process.env,KORSET_BROWSER_TEST:'true'}})
child.on('error',error=>{console.error(error.message);process.exitCode=1})
child.on('exit',code=>{process.exitCode=code??1})
