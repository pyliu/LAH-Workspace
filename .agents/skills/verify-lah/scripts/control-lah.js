#!/usr/bin/env node
/**
 * control-lah.js — LAH 工作區跨專案實機驗證與控制測試架 (Harness)
 *
 * 支援子指令：
 *   node .agents/skills/verify-lah/scripts/control-lah.js launch [--fe-mode dev|start]
 *   node .agents/skills/verify-lah/scripts/control-lah.js doctor [--require-browser]
 *   node .agents/skills/verify-lah/scripts/control-lah.js api <endpoint> [--data key=val ...] [--json <out.json>]
 *   node .agents/skills/verify-lah/scripts/control-lah.js ws <send|latest|upload|attachments|delete-attachment> [options]
 *   node .agents/skills/verify-lah/scripts/control-lah.js browser <goto|click|fill|press|wait|snapshot|screenshot|eval> [options]
 *   node .agents/skills/verify-lah/scripts/control-lah.js static [--json <out.json>]
 *   node .agents/skills/verify-lah/scripts/control-lah.js cleanup
 */

const fs = require('fs')
const path = require('path')
const http = require('http')
const { spawn, execFileSync } = require('child_process')

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..', '..')
const SKILL_DIR = path.resolve(__dirname, '..')
const STATE_DIR = path.join(SKILL_DIR, '.state')
const PIDS_FILE = path.join(STATE_DIR, 'pids.json')
const CHROME_PROFILE_DIR = path.join(STATE_DIR, 'chrome-profile')

const API_DIR = path.join(ROOT_DIR, 'LAH-API', 'www')
const FE_DIR = path.join(ROOT_DIR, 'LAH-FE')
const WSS_DIR = path.join(ROOT_DIR, 'lah-messenger-server')
const UPDATER_DIR = path.join(ROOT_DIR, 'LAH-Updater')

// 動態載入 lah-messenger-server 的 ws 套件
const WebSocket = require(path.join(WSS_DIR, 'node_modules', 'ws'))

const PORTS = {
  API: 80,
  FE: 8080,
  WS: 8081,
  WS_HTTP: 8082,
  CDP: 9222
}

function ensureDir (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function loadState () {
  if (!fs.existsSync(PIDS_FILE)) {
    return { spawnedPids: {}, preExistingPort80: false, startedAt: null }
  }
  try {
    return JSON.parse(fs.readFileSync(PIDS_FILE, 'utf8'))
  } catch (e) {
    return { spawnedPids: {}, preExistingPort80: false, startedAt: null }
  }
}

function saveState (state) {
  ensureDir(STATE_DIR)
  fs.writeFileSync(PIDS_FILE, JSON.stringify(state, null, 2), 'utf8')
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseArgs (argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        if (flags[key] !== undefined) {
          if (!Array.isArray(flags[key])) flags[key] = [flags[key]]
          flags[key].push(next)
        } else {
          flags[key] = next
        }
        i++
      } else {
        flags[key] = true
      }
    } else {
      positional.push(arg)
    }
  }
  return { positional, flags }
}

function getListeningProcess (port) {
  try {
    const cmd = `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 OwningProcess,@{Name="ProcessName";Expression={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}} | ConvertTo-Json -Compress`
    const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (!out) return null
    const parsed = JSON.parse(out)
    return { pid: parsed.OwningProcess, name: parsed.ProcessName || 'unknown' }
  } catch (e) {
    return null
  }
}

function checkEnvMockMode () {
  const envPath = path.join(API_DIR, '.env')
  if (!fs.existsSync(envPath)) {
    return { ok: false, reason: `找不到 ${envPath}` }
  }
  const content = fs.readFileSync(envPath, 'utf8')
  const match = content.match(/^\s*MOCK\s*=\s*([^\r\n#]+)/m)
  if (!match) {
    return { ok: false, reason: 'LAH-API/www/.env 中未設定 MOCK' }
  }
  const val = match[1].trim().toLowerCase()
  const ok = val === 'true' || val === '1'
  return { ok, value: val, reason: ok ? 'MOCK=true 已啟用' : `MOCK 值為 ${val}（違反 AGENTS.md 強制 MOCK=true 規範）` }
}

function httpRequest (options, bodyBuffer = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer,
          text: buffer.toString('utf8')
        })
      })
    })
    req.on('error', reject)
    req.setTimeout(options.timeout || 15000, () => {
      req.destroy(new Error(`HTTP request timeout (${options.path})`))
    })
    if (bodyBuffer) req.write(bodyBuffer)
    req.end()
  })
}

async function callLahApi (endpoint, formParams = {}) {
  const cleanEndpoint = endpoint.replace(/^\/?(api\/)?/, '')
  const searchParams = new URLSearchParams()
  for (const [k, v] of Object.entries(formParams)) {
    if (Array.isArray(v)) {
      v.forEach(item => searchParams.append(k, item))
    } else {
      searchParams.append(k, String(v))
    }
  }
  const bodyBuf = Buffer.from(searchParams.toString(), 'utf8')
  const res = await httpRequest({
    hostname: '127.0.0.1',
    port: PORTS.API,
    path: `/api/${cleanEndpoint}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': bodyBuf.length
    },
    timeout: 15000
  }, bodyBuf)
  let json = null
  try {
    json = JSON.parse(res.text)
  } catch (e) {
    // non-JSON
  }
  return { statusCode: res.statusCode, text: res.text, json }
}

async function checkWsRegister () {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORTS.WS}`)
    const timer = setTimeout(() => {
      try { ws.terminate() } catch (e) {}
      resolve({ ok: false, reason: 'WebSocket 連線或註冊回應逾時' })
    }, 5000)

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'command',
        channel: 'lds',
        message: {
          command: 'register',
          ip: '127.0.0.1',
          domain: 'VERIFY',
          userid: 'HAVERIFY',
          username: '驗證代理',
          dept: 'inf',
          channel: 'lds'
        }
      }))
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString('utf8'))
        const inner = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message
        if (inner && inner.command === 'register' && inner.success) {
          clearTimeout(timer)
          ws.close()
          resolve({ ok: true, payload: inner.payload })
        }
      } catch (e) {
        // ignore other broadcast messages
      }
    })

    ws.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, reason: err.message })
    })
  })
}

async function checkFeReady () {
  try {
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port: PORTS.FE,
      path: '/',
      method: 'GET',
      timeout: 8000
    })
    const isLoadingScreen = res.text.includes('nuxt_loading_screen') || res.text.includes('Loading app...')
    const hasNuxtRoot = res.text.includes('id="__nuxt"') || res.text.includes('window.__NUXT__')
    if (res.statusCode === 200 && hasNuxtRoot && !isLoadingScreen) {
      return { ok: true, statusCode: res.statusCode }
    }
    return {
      ok: false,
      statusCode: res.statusCode,
      reason: isLoadingScreen ? 'Nuxt Webpack 尚在編譯中 (Loading screen)' : '未偵測到 __nuxt 根節點'
    }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

function findChromeBinary () {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function psSingleQuote (str) {
  return `'${String(str).replace(/'/g, "''")}'`
}

function spawnDetached (exe, args, cwd, logName) {
  ensureDir(STATE_DIR)
  const outLogPath = path.join(STATE_DIR, `${logName}.out.log`)
  const errLogPath = path.join(STATE_DIR, `${logName}.err.log`)
  const quotedExe = `"${exe}"`
  const quotedArgs = args.map(a => {
    const s = String(a)
    return s.includes(' ') || s.includes('"') ? `"${s.replace(/"/g, '\\"')}"` : s
  }).join(' ')
  const cmdLine = `cmd.exe /c "${quotedExe} ${quotedArgs} 1>>"${outLogPath}" 2>>"${errLogPath}""`
  const psScript = [
    '$si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }',
    `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = ${psSingleQuote(cmdLine)}; CurrentDirectory = ${psSingleQuote(cwd)}; ProcessStartupInformation = $si }`,
    'if ($r.ReturnValue -ne 0) { throw "Win32_Process.Create failed with code $($r.ReturnValue)" }',
    'Write-Output $r.ProcessId'
  ].join('; ')
  const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
  const out = execFileSync('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
  return parseInt(out, 10)
}

async function cmdLaunch (flags) {
  console.log('=== [Launch] 啟動 LAH 工作區驗證環境 ===')
  const envCheck = checkEnvMockMode()
  if (!envCheck.ok) {
    console.error(`[FAIL] 安全檢查未通過：${envCheck.reason}`)
    process.exit(1)
  }
  console.log(`[OK] LAH-API .env 安全檢查：${envCheck.reason}`)

  const state = loadState()
  state.startedAt = new Date().toISOString()

  // 1. LAH-API (:80) — 區分「事務所開發 PC 常駐 Apache 2.4 (httpd)」與「筆電開發折衷方案 (run_dev_http.bat / php -S)」
  const p80 = getListeningProcess(PORTS.API)
  if (p80) {
    const isApache = /httpd|apache/i.test(p80.name)
    console.log(`[INFO] Port 80 偵測到${isApache ? '事務所開發 PC 常駐 Apache 2.4 服務' : '既有服務'} (${p80.name}, PID ${p80.pid})，直接沿用且略過 run_dev_http.bat。`)
    state.preExistingPort80 = true
    state.apiMode = isApache ? 'apache-resident' : `existing-${p80.name}`
  } else {
    console.log('[LAUNCH] Port 80 未偵測到常駐 Apache，啟用筆電開發折衷方案 (LAH-API/www/run_dev_http.bat -> php -S 0.0.0.0:80 -t .)...')
    const pid = spawnDetached('php.exe', ['-S', '0.0.0.0:80', '-t', '.'], API_DIR, 'lah-api')
    state.spawnedPids.api = pid
    state.preExistingPort80 = false
    state.apiMode = 'php-builtin-fallback'
  }

  // 2. lah-messenger-server (:8081 / :8082)
  const p8081 = getListeningProcess(PORTS.WS)
  if (p8081) {
    console.log(`[INFO] Port 8081 已由程序占用 (${p8081.name}, PID ${p8081.pid})。`)
  } else {
    console.log('[LAUNCH] 啟動 lah-messenger-server (node server.js)...')
    const pid = spawnDetached(process.execPath, ['server.js'], WSS_DIR, 'lah-messenger-server')
    state.spawnedPids.wss = pid
  }

  // 3. LAH-FE (:8080)
  const p8080 = getListeningProcess(PORTS.FE)
  if (p8080) {
    console.log(`[INFO] Port 8080 已由程序占用 (${p8080.name}, PID ${p8080.pid})。`)
  } else {
    const feMode = flags['fe-mode'] || (fs.existsSync(path.join(FE_DIR, '.nuxt', 'dist', 'server')) ? 'start' : 'dev')
    const nuxtBin = path.join(FE_DIR, 'node_modules', 'nuxt', 'bin', 'nuxt.js')
    const nuxtArgs = feMode === 'start' ? [nuxtBin, 'start'] : [nuxtBin]
    console.log(`[LAUNCH] 啟動 LAH-FE (mode=${feMode}, Port 8080)...`)
    const pid = spawnDetached(process.execPath, nuxtArgs, FE_DIR, 'lah-fe')
    state.spawnedPids.fe = pid
  }

  // 4. Headless Chrome CDP (:9222)
  const p9222 = getListeningProcess(PORTS.CDP)
  if (p9222) {
    console.log(`[INFO] Port 9222 (CDP) 已由程序占用 (${p9222.name}, PID ${p9222.pid})。`)
  } else {
    const chromeBin = findChromeBinary()
    if (!chromeBin) {
      console.error('[FAIL] 找不到 Chrome 或 Edge 執行檔，無法啟動瀏覽器測試架。')
      process.exit(1)
    }
    ensureDir(CHROME_PROFILE_DIR)
    console.log(`[LAUNCH] 啟動 Headless Chrome CDP (Port ${PORTS.CDP})...`)
    const pid = spawnDetached(chromeBin, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${PORTS.CDP}`,
      '--window-size=1440,900',
      `--user-data-dir=${CHROME_PROFILE_DIR}`,
      'about:blank'
    ], ROOT_DIR, 'chrome-cdp')
    state.spawnedPids.chrome = pid
  }

  saveState(state)

  // 等待所有服務就緒
  console.log('[WAIT] 等待所有服務進入可操作就緒狀態 (Ready)...')
  const deadline = Date.now() + 90000
  let lastStatus = ''
  while (Date.now() < deadline) {
    const feReady = await checkFeReady()
    const wsReady = getListeningProcess(PORTS.WS) !== null
    const http8082Ready = getListeningProcess(PORTS.WS_HTTP) !== null
    const cdpReady = getListeningProcess(PORTS.CDP) !== null
    if (feReady.ok && wsReady && http8082Ready && cdpReady) {
      console.log('[READY] LAH-API (:80), LAH-FE (:8080), lah-messenger-server (:8081/:8082), Chrome CDP (:9222) 皆已就緒！')
      return
    }
    const statusStr = `FE=${feReady.ok ? 'OK' : feReady.reason}, WS=${wsReady}, HTTP8082=${http8082Ready}, CDP=${cdpReady}`
    if (statusStr !== lastStatus) {
      console.log(`  ... 等待中: ${statusStr}`)
      lastStatus = statusStr
    }
    await sleep(1500)
  }
  console.error('[FAIL] 啟動逾時（90 秒），請執行 doctor 檢查各端點狀態。')
  process.exit(1)
}

async function cmdDoctor (flags) {
  console.log('=== [Doctor] LAH 工作區健康與安全護欄檢查 ===')
  const report = {
    timestamp: new Date().toISOString(),
    checks: {}
  }
  let allOk = true

  // 1. .env MOCK=true 檢查
  const envMock = checkEnvMockMode()
  report.checks.envMock = envMock
  if (!envMock.ok) allOk = false
  console.log(`[${envMock.ok ? 'PASS' : 'FAIL'}] 1. LAH-API .env MOCK 檢查: ${envMock.reason}`)

  // 2. LAH-API 實機登入、宿主環境（事務所常駐 Apache 2.4 vs 筆電 run_dev_http.bat）與 MOCK 狀態檢查
  try {
    const p80 = getListeningProcess(PORTS.API)
    const apiRes = await callLahApi('auth_json_api.php', { type: 'login', req_ip: '127.0.0.1' })
    const isMock = apiRes.json?.configs?.mock === true
    const statusOk = apiRes.json?.status === 1
    const serverSoftware = apiRes.json?.server?.SERVER_SOFTWARE || 'unknown'
    const docRoot = apiRes.json?.server?.DOCUMENT_ROOT || ''
    const hostMode = /apache/i.test(serverSoftware) || (p80 && /httpd/i.test(p80.name))
      ? '事務所開發PC常駐 Apache 2.4'
      : '筆電折衷 PHP 內建伺服器 (run_dev_http.bat)'
    const ok = statusOk && isMock
    report.checks.lahApi = {
      ok,
      hostMode,
      process: p80,
      serverSoftware,
      documentRoot: docRoot,
      status: apiRes.json?.status,
      mock: apiRes.json?.configs?.mock,
      site: apiRes.json?.configs?.site,
      userId: apiRes.json?.user?.id,
      isAdmin: apiRes.json?.configs?.authority?.isAdmin
    }
    if (!ok) allOk = false
    console.log(`[${ok ? 'PASS' : 'FAIL'}] 2. LAH-API (:80) 實機檢查 [${hostMode} | ${serverSoftware}]: status=${apiRes.json?.status}, mock=${isMock}, site=${apiRes.json?.configs?.site}, user=${apiRes.json?.user?.id}`)
  } catch (e) {
    allOk = false
    report.checks.lahApi = { ok: false, error: e.message }
    console.log(`[FAIL] 2. LAH-API (:80) 實機檢查失敗: ${e.message}`)
  }

  // 3. LAH-FE (:8080) 檢查
  const feCheck = await checkFeReady()
  report.checks.lahFe = feCheck
  if (!feCheck.ok) allOk = false
  console.log(`[${feCheck.ok ? 'PASS' : 'FAIL'}] 3. LAH-FE (:8080) 實機檢查: ${feCheck.ok ? 'HTTP 200 & __nuxt 已就緒' : feCheck.reason}`)

  // 4. lah-messenger-server WebSocket (:8081) 檢查
  const wsCheck = await checkWsRegister()
  report.checks.wsServer = wsCheck
  if (!wsCheck.ok) allOk = false
  console.log(`[${wsCheck.ok ? 'PASS' : 'FAIL'}] 4. lah-messenger-server WS (:8081) 註冊握手檢查: ${wsCheck.ok ? 'ACK -1 成功' : wsCheck.reason}`)

  // 5. lah-messenger-server HTTP (:8082) 附件端點檢查
  try {
    const attRes = await httpRequest({
      hostname: '127.0.0.1',
      port: PORTS.WS_HTTP,
      path: '/api/attachments/lds/1',
      method: 'GET',
      timeout: 5000
    })
    const attJson = JSON.parse(attRes.text)
    const ok = attRes.statusCode === 200 && attJson.status === 1
    report.checks.wsHttpServer = { ok, statusCode: attRes.statusCode, status: attJson.status }
    if (!ok) allOk = false
    console.log(`[${ok ? 'PASS' : 'FAIL'}] 5. lah-messenger-server HTTP (:8082) 附件 API 檢查: HTTP ${attRes.statusCode}, status=${attJson.status}`)
  } catch (e) {
    allOk = false
    report.checks.wsHttpServer = { ok: false, error: e.message }
    console.log(`[FAIL] 5. lah-messenger-server HTTP (:8082) 附件 API 檢查失敗: ${e.message}`)
  }

  // 6. Chrome CDP (:9222) 檢查
  try {
    const cdpRes = await httpRequest({
      hostname: '127.0.0.1',
      port: PORTS.CDP,
      path: '/json/version',
      method: 'GET',
      timeout: 3000
    })
    const cdpJson = JSON.parse(cdpRes.text)
    const ok = cdpRes.statusCode === 200 && !!cdpJson.Browser
    report.checks.chromeCdp = { ok, browser: cdpJson.Browser }
    if (!ok) allOk = false
    console.log(`[${ok ? 'PASS' : 'FAIL'}] 6. Headless Chrome CDP (:9222) 檢查: ${cdpJson.Browser}`)
  } catch (e) {
    allOk = false
    report.checks.chromeCdp = { ok: false, error: e.message }
    console.log(`[FAIL] 6. Headless Chrome CDP (:9222) 檢查失敗: ${e.message}`)
  }

  if (flags.json) {
    ensureDir(path.dirname(path.resolve(flags.json)))
    fs.writeFileSync(path.resolve(flags.json), JSON.stringify(report, null, 2), 'utf8')
  }

  if (!allOk) {
    console.error('=== [Doctor Result] UNHEALTHY (請先執行 launch 或排查異常服務) ===')
    process.exit(1)
  }
  console.log('=== [Doctor Result] HEALTHY (所有服務與 MOCK 安全護欄皆正常) ===')
}

async function cmdApi (positional, flags) {
  const endpoint = positional[0]
  if (!endpoint) {
    console.error('用法: control-lah.js api <endpoint> [--data key=val ...] [--json <out.json>]')
    process.exit(1)
  }
  const envMock = checkEnvMockMode()
  if (!envMock.ok) {
    console.error(`[FAIL] 拒絕呼叫 LAH-API：${envMock.reason}`)
    process.exit(1)
  }
  const params = {}
  const dataItems = flags.data ? (Array.isArray(flags.data) ? flags.data : [flags.data]) : []
  for (const item of dataItems) {
    const eqIdx = item.indexOf('=')
    if (eqIdx > 0) {
      const k = item.slice(0, eqIdx)
      const v = item.slice(eqIdx + 1)
      if (params[k] !== undefined) {
        if (!Array.isArray(params[k])) params[k] = [params[k]]
        params[k].push(v)
      } else {
        params[k] = v
      }
    }
  }
  const res = await callLahApi(endpoint, params)
  const output = res.json || { statusCode: res.statusCode, rawText: res.text }
  if (flags.json) {
    const outPath = path.resolve(flags.json)
    ensureDir(path.dirname(outPath))
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8')
    console.log(`[SAVED] API 回應已寫入 ${outPath}`)
  }
  console.log(JSON.stringify(output, null, 2))
}

function assertTestChannel (channel, allowNonTest) {
  if (!allowNonTest && !String(channel).startsWith('verify_test')) {
    throw new Error(`安全護欄阻擋：寫入/異動操作必須使用以 "verify_test" 開頭的隔離測試頻道（目前指定: "${channel}"），嚴禁汙染既有頻道資料庫。`)
  }
}

async function cmdWs (positional, flags) {
  const sub = positional[0]
  const channel = flags.channel || 'verify_test_run'

  if (sub === 'send') {
    assertTestChannel(channel, flags['allow-non-test-channel'])
    const sender = flags.sender || 'HAADMIN'
    const content = flags.content || 'Verify test message'
    const title = flags.title || ''
    const priority = parseInt(flags.priority || '3', 10)

    const result = await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${PORTS.WS}`)
      const timer = setTimeout(() => {
        try { ws.terminate() } catch (e) {}
        reject(new Error('WebSocket send timeout'))
      }, 8000)

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'command',
          channel,
          message: {
            command: 'register',
            ip: '127.0.0.1',
            domain: 'VERIFY',
            userid: sender,
            username: '系統管理員',
            dept: 'inf',
            channel
          }
        }))
      })

      let sent = false
      ws.on('message', (raw) => {
        try {
          const outer = JSON.parse(raw.toString('utf8'))
          const inner = typeof outer.message === 'string' ? (() => { try { return JSON.parse(outer.message) } catch (e) { return outer.message } })() : outer.message
          if (!sent && outer.type === 'ack' && inner && inner.command === 'register') {
            sent = true
            ws.send(JSON.stringify({
              type: 'mine',
              channel,
              title,
              message: content,
              priority,
              sender,
              from: '127.0.0.1',
              flag: 0
            }))
          } else if (sent && outer.type === 'ack' && String(outer.id) === '-99' && inner && inner.command === 'private_message') {
            clearTimeout(timer)
            ws.close()
            resolve({
              ok: true,
              channel,
              message: {
                id: inner.payload.insertedId,
                channel,
                sender,
                content
              }
            })
          } else if (sent && outer.type === 'remote' && outer.channel === channel && Number(outer.id) > 0) {
            clearTimeout(timer)
            ws.close()
            resolve({
              ok: true,
              channel,
              message: {
                id: outer.id,
                channel,
                sender: outer.sender,
                content: outer.message
              }
            })
          }
        } catch (e) {}
      })

      ws.on('error', err => {
        clearTimeout(timer)
        reject(err)
      })
    })

    if (flags.json) {
      const outPath = path.resolve(flags.json)
      ensureDir(path.dirname(outPath))
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8')
    }
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (sub === 'latest') {
    const limit = parseInt(flags.limit || '10', 10)
    const result = await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${PORTS.WS}`)
      const messages = []
      let collectTimer = null
      const timeout = setTimeout(() => {
        try { ws.close() } catch (e) {}
        resolve({ ok: true, channel, count: messages.length, messages })
      }, 3000)

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'command',
          channel,
          message: {
            command: 'register',
            ip: '127.0.0.1',
            domain: 'VERIFY_READER',
            userid: 'HAREADER',
            username: '唯讀檢視者',
            dept: 'inf',
            channel
          }
        }))
      })

      let queried = false
      ws.on('message', (raw) => {
        try {
          const outer = JSON.parse(raw.toString('utf8'))
          const inner = typeof outer.message === 'string' ? (() => { try { return JSON.parse(outer.message) } catch (e) { return outer.message } })() : outer.message
          if (!queried && outer.type === 'ack' && inner && inner.command === 'register') {
            queried = true
            ws.send(JSON.stringify({
              type: 'command',
              channel,
              message: {
                command: 'latest',
                channel,
                count: limit
              }
            }))
          } else if (queried && outer.type === 'remote' && outer.channel === channel && Number(outer.id) > 0) {
            messages.push({
              id: outer.id,
              sender: outer.sender,
              date: outer.date,
              time: outer.time,
              content: outer.message,
              attachments: outer.attachments || []
            })
            if (collectTimer) clearTimeout(collectTimer)
            collectTimer = setTimeout(() => {
              clearTimeout(timeout)
              ws.close()
              resolve({ ok: true, channel, count: messages.length, messages })
            }, 350)
          }
        } catch (e) {}
      })

      ws.on('error', err => {
        clearTimeout(timeout)
        reject(err)
      })
    })

    if (flags.json) {
      const outPath = path.resolve(flags.json)
      ensureDir(path.dirname(outPath))
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8')
    }
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (sub === 'upload') {
    assertTestChannel(channel, flags['allow-non-test-channel'])
    const messageId = String(flags['message-id'] || '')
    const filePath = path.resolve(flags.file || '')
    if (!messageId || !fs.existsSync(filePath)) {
      console.error('用法: control-lah.js ws upload --channel <verify_test_*> --message-id <id> --file <path> [--json <out.json>]')
      process.exit(1)
    }
    const boundary = '----LahVerifyBoundary' + Date.now()
    const fileName = path.basename(filePath)
    const fileContent = fs.readFileSync(filePath)

    // 注意：upload-router.js 要求 multipart 欄位依序為 channel, message_id, file
    const parts = [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="channel"\r\n\r\n${channel}\r\n`, 'utf8'),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="message_id"\r\n\r\n${messageId}\r\n`, 'utf8'),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/plain\r\n\r\n`, 'utf8'),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]
    const bodyBuf = Buffer.concat(parts)
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port: PORTS.WS_HTTP,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuf.length
      }
    }, bodyBuf)
    const out = JSON.parse(res.text)
    if (flags.json) {
      const outPath = path.resolve(flags.json)
      ensureDir(path.dirname(outPath))
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')
    }
    console.log(JSON.stringify(out, null, 2))
    return
  }

  if (sub === 'attachments') {
    const messageId = String(flags['message-id'] || '1')
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port: PORTS.WS_HTTP,
      path: `/api/attachments/${encodeURIComponent(channel)}/${encodeURIComponent(messageId)}`,
      method: 'GET'
    })
    const out = JSON.parse(res.text)
    if (flags.json) {
      const outPath = path.resolve(flags.json)
      ensureDir(path.dirname(outPath))
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')
    }
    console.log(JSON.stringify(out, null, 2))
    return
  }

  if (sub === 'delete-attachment') {
    assertTestChannel(channel, flags['allow-non-test-channel'])
    const messageId = String(flags['message-id'] || '')
    const filename = String(flags.filename || '')
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port: PORTS.WS_HTTP,
      path: `/api/attachments/${encodeURIComponent(channel)}/${encodeURIComponent(messageId)}/${encodeURIComponent(filename)}`,
      method: 'DELETE'
    })
    const out = JSON.parse(res.text)
    if (flags.json) {
      const outPath = path.resolve(flags.json)
      ensureDir(path.dirname(outPath))
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')
    }
    console.log(JSON.stringify(out, null, 2))
    return
  }

  console.error(`不支援的 ws 子指令: ${sub}`)
  process.exit(1)
}

// ======================= Headless Chrome CDP 客戶端 =======================
async function withCdpPage (fn) {
  const listRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORTS.CDP,
    path: '/json/list',
    method: 'GET',
    timeout: 5000
  })
  const targets = JSON.parse(listRes.text)
  let pageTarget = targets.find(t => t.type === 'page')
  if (!pageTarget) {
    const newRes = await httpRequest({
      hostname: '127.0.0.1',
      port: PORTS.CDP,
      path: '/json/new?about:blank',
      method: 'PUT',
      timeout: 5000
    })
    pageTarget = JSON.parse(newRes.text)
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })

  let seq = 1
  const pending = new Map()
  ws.on('message', raw => {
    const msg = JSON.parse(raw.toString('utf8'))
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    }
  })

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = seq++
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })

  const evalJs = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    })
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'JS Eval Error')
    }
    return res.result?.value
  }

  try {
    await send('Page.enable')
    await send('Runtime.enable')
    await send('DOM.enable')
    return await fn({ send, evalJs })
  } finally {
    try { ws.close() } catch (e) {}
  }
}

async function cmdBrowser (positional, flags) {
  const sub = positional[0]
  if (!sub) {
    console.error('用法: control-lah.js browser <goto|click|fill|press|wait|snapshot|screenshot|eval> [options]')
    process.exit(1)
  }

  await withCdpPage(async ({ send, evalJs }) => {
    if (sub === 'goto') {
      const url = positional[1] || flags.url
      if (!url) throw new Error('請提供目標 URL')
      await send('Page.navigate', { url })
      const waitMs = parseInt(flags['wait-ms'] || '2500', 10)
      const deadline = Date.now() + 15000
      while (Date.now() < deadline) {
        const readyState = await evalJs('document.readyState')
        if (readyState === 'complete') break
        await sleep(250)
      }
      await sleep(waitMs)
      const info = await evalJs('({ url: location.href, title: document.title })')
      console.log(JSON.stringify({ action: 'goto', ...info }, null, 2))
      return
    }

    if (sub === 'wait') {
      if (flags.ms) {
        await sleep(parseInt(flags.ms, 10))
      }
      const text = flags.text
      const selector = flags.selector
      const timeout = parseInt(flags.timeout || '10000', 10)
      if (text || selector) {
        const deadline = Date.now() + timeout
        let found = false
        while (Date.now() < deadline) {
          found = await evalJs(`(() => {
            const sel = ${JSON.stringify(selector || null)};
            const txt = ${JSON.stringify(text || null)};
            if (sel && !document.querySelector(sel)) return false;
            if (txt && !(document.body && document.body.innerText.includes(txt))) return false;
            return true;
          })()`)
          if (found) break
          await sleep(250)
        }
        if (!found) {
          throw new Error(`等待逾時 (${timeout}ms): selector=${selector || ''}, text=${text || ''}`)
        }
      }
      console.log(JSON.stringify({ action: 'wait', ok: true, selector: selector || null, text: text || null }, null, 2))
      return
    }

    if (sub === 'click') {
      const selector = flags.selector || null
      const text = flags.text || null
      const role = flags.role || null
      const name = flags.name || null
      const res = await evalJs(`(() => {
        const sel = ${JSON.stringify(selector)};
        const txt = ${JSON.stringify(text)};
        const role = ${JSON.stringify(role)};
        const name = ${JSON.stringify(name)};
        const isVisible = el => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        let candidates = [];
        if (sel) {
          candidates = Array.from(document.querySelectorAll(sel));
        } else if (role === 'button') {
          candidates = Array.from(document.querySelectorAll('button, [role="button"], a.btn, input[type="button"], input[type="submit"]'));
        } else if (role === 'link') {
          candidates = Array.from(document.querySelectorAll('a, [role="link"]'));
        } else {
          candidates = Array.from(document.querySelectorAll('button, a, [role="button"], label, .btn, .star-btn, .filter-pill, .sidebar-edge-handle, .system-card, .feature-card, input, span, div'));
        }
        const targetText = name || txt;
        if (targetText) {
          const exact = candidates.filter(el => isVisible(el) && (
            (el.innerText && el.innerText.trim() === targetText) ||
            (el.getAttribute('title') && el.getAttribute('title').includes(targetText)) ||
            (el.getAttribute('aria-label') && el.getAttribute('aria-label').includes(targetText))
          ));
          if (exact.length > 0) {
            candidates = exact;
          } else {
            candidates = candidates.filter(el => isVisible(el) && (
              (el.innerText && el.innerText.includes(targetText)) ||
              (el.getAttribute('title') && el.getAttribute('title').includes(targetText)) ||
              (el.getAttribute('aria-label') && el.getAttribute('aria-label').includes(targetText))
            ));
          }
        } else {
          candidates = candidates.filter(isVisible);
        }
        if (candidates.length === 0) {
          return { ok: false, error: '找不到符合條件的可見元素' };
        }
        const el = candidates[0];
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.click();
        return {
          ok: true,
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || '').trim().slice(0, 80),
          title: el.getAttribute('title') || '',
          href: el.getAttribute('href') || ''
        };
      })()`)
      if (!res || !res.ok) {
        throw new Error(res?.error || '點擊失敗')
      }
      await sleep(parseInt(flags['wait-ms'] || '600', 10))
      console.log(JSON.stringify({ action: 'click', ...res }, null, 2))
      return
    }

    if (sub === 'fill') {
      const selector = flags.selector || null
      const placeholder = flags.placeholder || null
      const value = flags.value !== undefined ? String(flags.value) : ''
      const res = await evalJs(`(() => {
        const sel = ${JSON.stringify(selector)};
        const ph = ${JSON.stringify(placeholder)};
        const val = ${JSON.stringify(value)};
        const isVisible = el => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        };
        let inputs = sel
          ? Array.from(document.querySelectorAll(sel))
          : Array.from(document.querySelectorAll('input, textarea, select'));
        inputs = inputs.filter(isVisible);
        if (ph) {
          inputs = inputs.filter(el => (el.getAttribute('placeholder') || '').includes(ph));
        }
        if (inputs.length === 0) {
          return { ok: false, error: '找不到符合條件的輸入框' };
        }
        const el = inputs[0];
        el.focus();
        const proto = el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : el.tagName === 'SELECT'
            ? window.HTMLSelectElement.prototype
            : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return {
          ok: true,
          tag: el.tagName.toLowerCase(),
          placeholder: el.getAttribute('placeholder') || '',
          value: el.value
        };
      })()`)
      if (!res || !res.ok) {
        throw new Error(res?.error || '填寫欄位失敗')
      }
      await sleep(parseInt(flags['wait-ms'] || '400', 10))
      console.log(JSON.stringify({ action: 'fill', ...res }, null, 2))
      return
    }

    if (sub === 'press') {
      const key = positional[1] || flags.key || 'Enter'
      await evalJs(`(() => {
        const k = ${JSON.stringify(key)};
        const target = document.activeElement || document.body;
        target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      })()`)
      await sleep(300)
      console.log(JSON.stringify({ action: 'press', key }, null, 2))
      return
    }

    if (sub === 'snapshot') {
      const outPath = path.resolve(flags.path || path.join(SKILL_DIR, 'artifacts', 'snapshot.aria.txt'))
      ensureDir(path.dirname(outPath))
      const snap = await evalJs(`(() => {
        const lines = [];
        lines.push('URL: ' + location.href);
        lines.push('Title: ' + document.title);
        lines.push('Timestamp: ' + new Date().toISOString());
        lines.push('--- Interactive Elements (ARIA / Controls) ---');
        const controls = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, button, a, input, select, textarea, [role], .badge'));
        for (const el of controls) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute('role') || tag;
          const title = el.getAttribute('title') || el.getAttribute('placeholder') || '';
          const text = (el.value !== undefined && (tag === 'input' || tag === 'select' || tag === 'textarea'))
            ? String(el.value)
            : (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 100);
          if (!text && !title) continue;
          lines.push(\`[\${role}] text="\${text}"\${title ? ' title="' + title + '"' : ''}\`);
        }
        lines.push('--- Page Text Summary ---');
        lines.push((document.body ? document.body.innerText : '').trim().slice(0, 4000));
        return lines.join('\\n');
      })()`)
      fs.writeFileSync(outPath, snap, 'utf8')
      console.log(JSON.stringify({ action: 'snapshot', path: outPath, bytes: Buffer.byteLength(snap, 'utf8') }, null, 2))
      return
    }

    if (sub === 'screenshot') {
      const outPath = path.resolve(flags.path || path.join(SKILL_DIR, 'artifacts', 'screenshot.png'))
      ensureDir(path.dirname(outPath))
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: !!flags['full-page']
      })
      const buf = Buffer.from(data, 'base64')
      fs.writeFileSync(outPath, buf)
      console.log(JSON.stringify({ action: 'screenshot', path: outPath, bytes: buf.length }, null, 2))
      return
    }

    if (sub === 'eval') {
      const expr = positional[1] || flags.expr
      const val = await evalJs(expr)
      console.log(JSON.stringify({ action: 'eval', value: val }, null, 2))
      return
    }

    throw new Error(`不支援的 browser 子指令: ${sub}`)
  })
}

async function cmdStatic (flags) {
  console.log('=== [Static] 執行各子專案語法與靜態檢查 ===')
  const results = {}

  // 1. LAH-API: php -l
  try {
    const phpOut = execFileSync('php.exe', ['-l', 'api/auth_json_api.php'], { cwd: API_DIR, encoding: 'utf8' }).trim()
    const phpOut2 = execFileSync('php.exe', ['-l', 'include/System.class.php'], { cwd: API_DIR, encoding: 'utf8' }).trim()
    results['LAH-API'] = { ok: true, output: [phpOut, phpOut2] }
    console.log(`[PASS] LAH-API (php -l): ${phpOut}`)
  } catch (e) {
    results['LAH-API'] = { ok: false, error: e.message }
    console.log(`[FAIL] LAH-API: ${e.message}`)
  }

  // 2. lah-messenger-server: node -c
  try {
    execFileSync(process.execPath, ['-c', 'server.js'], { cwd: WSS_DIR, encoding: 'utf8' })
    execFileSync(process.execPath, ['-c', 'request-handler.js'], { cwd: WSS_DIR, encoding: 'utf8' })
    execFileSync(process.execPath, ['-c', 'upload-router.js'], { cwd: WSS_DIR, encoding: 'utf8' })
    results['lah-messenger-server'] = { ok: true, checked: ['server.js', 'request-handler.js', 'upload-router.js'] }
    console.log('[PASS] lah-messenger-server (node -c): server.js, request-handler.js, upload-router.js 語法正確')
  } catch (e) {
    results['lah-messenger-server'] = { ok: false, error: e.message }
    console.log(`[FAIL] lah-messenger-server: ${e.message}`)
  }

  // 3. LAH-Updater: python -m py_compile updater.py
  try {
    execFileSync('python.exe', ['-m', 'py_compile', 'updater.py'], { cwd: UPDATER_DIR, encoding: 'utf8' })
    results['LAH-Updater'] = { ok: true, checked: ['updater.py'] }
    console.log('[PASS] LAH-Updater (python -m py_compile updater.py): 語法正確')
  } catch (e) {
    results['LAH-Updater'] = { ok: false, error: e.message }
    console.log(`[FAIL] LAH-Updater: ${e.message}`)
  }

  if (flags.json) {
    const outPath = path.resolve(flags.json)
    ensureDir(path.dirname(outPath))
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8')
  }
}

async function cmdCleanup () {
  console.log('=== [Cleanup] 拆除本次驗證實例與隔離測試資料（保留驗證證據） ===')
  const state = loadState()

  // 1. 關閉我們啟動的 PID 與佔用 8080, 8081, 8082, 9222 的程序（嚴格保護 Port 80 非 PHP 服務如 Apache httpd）
  for (const port of [PORTS.FE, PORTS.WS, PORTS.WS_HTTP, PORTS.CDP]) {
    const proc = getListeningProcess(port)
    if (proc) {
      console.log(`[STOP] 終止 Port ${port} 程序 (${proc.name}, PID ${proc.pid})...`)
      try {
        execFileSync('taskkill.exe', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
      } catch (e) {}
    }
  }

  const p80 = getListeningProcess(PORTS.API)
  if (p80) {
    if (/php/i.test(p80.name) && !state.preExistingPort80) {
      console.log(`[STOP] 終止 Port 80 PHP 測試伺服器 (PID ${p80.pid})...`)
      try {
        execFileSync('taskkill.exe', ['/PID', String(p80.pid), '/T', '/F'], { stdio: 'ignore' })
      } catch (e) {}
    } else {
      console.log(`[SKIP] 保留 Port 80 既有伺服器 (${p80.name}, PID ${p80.pid})。`)
    }
  }

  // 2. 清理 lah-messenger-server 下的隔離測試頻道資料庫 (db/verify_test_*.db*) 與上傳目錄 (uploads/verify_test_*)
  const dbDir = path.join(WSS_DIR, 'db')
  if (fs.existsSync(dbDir)) {
    for (const f of fs.readdirSync(dbDir)) {
      if (f.startsWith('verify_test')) {
        const full = path.join(dbDir, f)
        try {
          fs.unlinkSync(full)
          console.log(`[CLEAN] 已移除隔離測試資料庫: ${full}`)
        } catch (e) {}
      }
    }
  }

  const uploadsDir = path.join(WSS_DIR, 'uploads')
  if (fs.existsSync(uploadsDir)) {
    for (const d of fs.readdirSync(uploadsDir)) {
      if (d.startsWith('verify_test')) {
        const full = path.join(uploadsDir, d)
        try {
          fs.rmSync(full, { recursive: true, force: true })
          console.log(`[CLEAN] 已移除隔離測試附件目錄: ${full}`)
        } catch (e) {}
      }
    }
  }

  // 3. 移除 .state 暫存目錄（絕不刪除 artifacts/ 證明產物目錄）
  await sleep(500)
  if (fs.existsSync(STATE_DIR)) {
    try {
      fs.rmSync(STATE_DIR, { recursive: true, force: true })
      console.log(`[CLEAN] 已移除執行期狀態目錄: ${STATE_DIR}`)
    } catch (e) {
      console.warn(`[WARN] 無法完全移除 ${STATE_DIR}: ${e.message}`)
    }
  }

  const artifactsDir = path.join(SKILL_DIR, 'artifacts')
  console.log(`[PRESERVED] 驗證證據目錄完好保留於: ${artifactsDir}`)
}

async function main () {
  const { positional, flags } = parseArgs(process.argv.slice(2))
  const cmd = positional[0]
  const restPositional = positional.slice(1)

  try {
    switch (cmd) {
      case 'launch':
        await cmdLaunch(flags)
        break
      case 'doctor':
        await cmdDoctor(flags)
        break
      case 'api':
        await cmdApi(restPositional, flags)
        break
      case 'ws':
        await cmdWs(restPositional, flags)
        break
      case 'browser':
        await cmdBrowser(restPositional, flags)
        break
      case 'static':
        await cmdStatic(flags)
        break
      case 'cleanup':
        await cmdCleanup()
        break
      default:
        console.error('用法: node control-lah.js <launch|doctor|api|ws|browser|static|cleanup> [options]')
        process.exit(1)
    }
  } catch (err) {
    console.error(`[ERROR] ${err.message}`)
    process.exit(1)
  }
}

main()
