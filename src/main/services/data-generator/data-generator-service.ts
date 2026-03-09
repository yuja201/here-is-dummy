import path from 'node:path'
import os from 'node:os'
import { app, BrowserWindow, utilityProcess } from 'electron'
import type { WorkerTask, WorkerResult, GenerateRequest, GenerationResult } from '@shared/types'
import { getDatabaseByProjectId } from '../../database/databases'
import { getDBMSById } from '../../database/dbms'
import { getRuleById } from '../../database/rules'
import { DBMS_ID_TO_KEY, type SupportedDBMS } from '../../utils/dbms-map'
import { createZipFromSqlFilesStreaming } from './zip-generator'
import { getFileCacheRoot } from '../../utils/cache-path'
import { fetchSchema } from '../../utils/schema-fetch'
import fs from 'node:fs'
import { createLogger } from '../../utils/logger'

const logger = createLogger('data-generator-service')
const MAX_PARALLEL = Math.max(1, Math.floor(os.cpus().length / 2))

export async function runDataGenerator(
  payload: GenerateRequest,
  mainWindow: BrowserWindow
): Promise<GenerationResult> {
  await app.whenReady()

  const { projectId, tables, mode = 'SQL_FILE' } = payload
  if (!tables.length) {
    throw new Error('No tables provided for data generation.')
  }

  const database = getDatabaseByProjectId(projectId)
  if (!database) {
    throw new Error(`Database connection info not found for project ${projectId}.`)
  }

  const dbms = getDBMSById(database.dbms_id)
  if (!dbms) {
    throw new Error(`DBMS not found for id ${database.dbms_id}.`)
  }

  const dbTypeKey: SupportedDBMS | undefined = DBMS_ID_TO_KEY[database.dbms_id]
  if (!dbTypeKey) {
    throw new Error(`Unsupported DBMS id: ${database.dbms_id}`)
  }

  const schema = await fetchSchema(projectId)

  const ruleIds = new Set<number>()
  for (const table of tables) {
    for (const column of table.columns) {
      if (
        (column.dataSource === 'FAKER' || column.dataSource === 'AI') &&
        'ruleId' in column.metaData &&
        typeof (column.metaData as { ruleId?: unknown }).ruleId === 'number'
      ) {
        ruleIds.add((column.metaData as { ruleId: number }).ruleId)
      }
    }
  }

  const rules = Array.from(ruleIds)
    .map((id) => getRuleById(id))
    .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    .map((rule) => ({
      id: rule.id,
      domain_name: rule.domain_name,
      model_id: rule.model_id,
      locale: rule.locale
    }))

  const databaseInfo = {
    id: database.id,
    dbms_name: dbms.name
  }

  const connectionInfo =
    mode === 'DIRECT_DB'
      ? {
          ...parseDatabaseUrl(database.url, dbTypeKey),
          username: database.username,
          password: database.password,
          database: database.database_name
        }
      : undefined

  const queue = [...tables]
  const running = new Set<ReturnType<typeof utilityProcess.fork>>()
  const results: WorkerResult[] = []
  const cacheRoot = getFileCacheRoot()

  const startNext = async (): Promise<void> => {
    try {
      if (queue.length === 0) return
      const table = queue.shift()!

      const task: WorkerTask = {
        projectId,
        dbType: dbTypeKey,
        table,
        schema,
        database: databaseInfo,
        rules,
        mode,
        connection: connectionInfo,
        skipInvalidRows: payload.skipInvalidRows ?? true
      }
      const isPackaged = app.isPackaged
      const baseDir = isPackaged
        ? fs.existsSync(path.join(process.resourcesPath, 'app.asar.unpacked'))
          ? path.join(process.resourcesPath, 'app.asar.unpacked')
          : path.join(process.resourcesPath, 'app')
        : app.getAppPath()

      const workerPath = path.join(baseDir, 'out', 'main', 'worker-runner.js')

      const child = utilityProcess.fork(workerPath, [], {
        stdio: 'pipe',
        env: {
          ...process.env,
          HERESDUMMY_CACHE_DIR: cacheRoot
        },
        serviceName: 'Data Generator Worker'
      })
      running.add(child)

      child.postMessage({
        type: 'start',
        task
      })

      let stderr = ''

      // 완료 행 수 받아서 진행 상황 프론트로 보내기
      child.on('message', (data) => {
        if (data.type) {
          if (data.type === 'worker-result') {
            results.push(data.result)
          } else {
            mainWindow.webContents.send('data-generator:progress', data)
          }
        }
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
        console.error('[worker] stderr:', data.toString())
      })

      child.on('exit', (code) => {
        running.delete(child)
        if (code !== 0) {
          results.push({
            success: false,
            tableName: table.tableName,
            sqlPath: '',
            error: stderr || `Worker exited with code ${code}`
          })
        }
        startNext()
      })
    } catch (err) {
      logger.error('startNext 실패', err)
      results.push({
        success: false,
        tableName: 'unknown',
        sqlPath: '',
        error: (err as Error).message
      })
    }
  }

  for (let i = 0; i < Math.min(MAX_PARALLEL, queue.length); i++) {
    startNext()
  }

  while (running.size > 0 || queue.length > 0) {
    await new Promise((res) => setTimeout(res, 300))
  }

  const successResults = results.filter((r) => r.success)
  const failedResults = results.filter((r) => !r.success)

  //DIRECT_DB 모드에서 sqlPath 없는 항목 제외
  const fileResults = successResults.filter(
    (r): r is WorkerResult & { sqlPath: string } =>
      typeof r.sqlPath === 'string' && r.sqlPath.length > 0 && fs.existsSync(r.sqlPath)
  )

  //파일 있는 경우에만 zip 생성
  let zipPath: string | null = null

  try {
    if (fileResults.length > 0) {
      zipPath = await createZipFromSqlFilesStreaming(
        fileResults.map((r) => ({ filename: r.tableName, path: r.sqlPath })),
        projectId
      )
    }
  } catch (err) {
    logger.error(`ZIP 생성 실패: ${(err as Error).message}`)
  } finally {
    // ZIP 생성 성공 여부와 관계없이 정리 시도
    if (fileResults.length > 0) {
      // ZIP 스트림 닫힘 대기
      await new Promise((r) => setTimeout(r, 200))

      for (const result of fileResults) {
        try {
          await deleteWithRetry(result.sqlPath)
        } catch (err) {
          logger.error(`SQL 파일 삭제 최종 실패: ${result.sqlPath}`, err)
        }
      }
    }
  }

  const executedTables = successResults.filter((r) => r.directInserted).map((r) => r.tableName)

  mainWindow.webContents.send('data-generator:progress', {
    type: 'all-complete',
    successCount: successResults.length,
    failCount: failedResults.length
  })

  const allErrors = failedResults.map((r) => `[${r.tableName}] ${r.error ?? 'Unknown error'}`)

  return {
    zipPath,
    successCount: successResults.length,
    failCount: failedResults.length,
    success: allErrors.length === 0,
    executedTables: executedTables.length ? executedTables : undefined,
    errors: allErrors.length ? allErrors : undefined
  }
}

function parseDatabaseUrl(rawUrl: string, dbType: SupportedDBMS): { host: string; port: number } {
  const defaultPort = dbType === 'mysql' ? 3306 : 5432

  // URL 스킴이 없다면 자동 보완 (예: localhost:5432 → postgres://localhost:5432)
  const maybeUrl = rawUrl.includes('://') ? rawUrl : `${dbType}://${rawUrl}`

  try {
    const parsedUrl = new URL(maybeUrl)

    const port = parsedUrl.port ? Number(parsedUrl.port) : defaultPort

    return {
      host: parsedUrl.hostname || 'localhost',
      port: Number.isFinite(port) ? port : defaultPort
    }
  } catch {
    // fallback: IPv6 & host:port 최소 지원
    const cleaned = rawUrl.replace(/^\[|\]$/g, '') // IPv6 bracket 제거
    const [hostPart, portPart] = cleaned.split(':')
    const port = Number(portPart)

    return {
      host: hostPart || 'localhost',
      port: Number.isFinite(port) ? port : defaultPort
    }
  }
}

// 재시도 기반 파일 삭제
async function deleteWithRetry(filePath: string, maxRetries = 3, delayMs = 500): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        logger.info(`SQL 파일 삭제 완료: ${filePath} (시도 ${attempt + 1}/${maxRetries})`)
        return
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if ((code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') && attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt) // 지수 백오프
        logger.warn(
          `파일 잠금 중, ${delay}ms 후 재시도 (${attempt + 1}/${maxRetries}): ${filePath}`
        )
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err // 그 외 에러는 전파
    }
  }
}
