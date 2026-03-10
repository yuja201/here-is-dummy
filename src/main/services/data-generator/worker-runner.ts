import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'
import { Client as PgClient } from 'pg'
import type { WorkerTask, WorkerResult } from '@shared/types.js'
import { DBMS_MAP } from '../../utils/dbms-map.js'
import { generateFakeStream } from './faker-generator.js'
import { generateAIStream } from './ai-generator.js'
import { createFileValueStream } from './file-generator.js'
import { generateFixedStream } from './fixed-generator.js'
import { generateReferenceStream } from './reference-generator.js'
import { ConnectionConfig } from '../../utils/db-connection-test.js'
import {
  DataSourceType,
  type ColumnMetaData,
  FakerMetaData,
  AIMetaData,
  FileMetaData,
  FixedMetaData,
  ReferenceMetaData
} from '@shared/types'
import { createLogger } from '../../utils/logger.js'

const logger = createLogger('worker-runner')

const INVALID = { __invalid: true } as const
type CellValue = string | typeof INVALID

// 컬럼별 스트림 생성 함수
function createColumnStream(
  col: {
    columnName: string
    dataSource: DataSourceType
    metaData?: ColumnMetaData
  },
  task: WorkerTask,
  recordCnt: number
): AsyncGenerator<string | null | undefined> {
  const { projectId, table, schema, database, rules } = task
  const { tableName } = table

  const dataSource = col.dataSource as DataSourceType

  switch (dataSource) {
    case 'FAKER': {
      if (!col.metaData || (col.metaData as FakerMetaData).ruleId == null) {
        throw new Error(
          `[Faker 메타데이터 오류] ${tableName}.${col.columnName} 컬럼의 Faker 규칙 설정이 올바르지 않습니다.`
        )
      }

      const meta = col.metaData as FakerMetaData
      const rule = rules.find((r) => r.id === meta.ruleId)
      if (!rule) {
        throw new Error(`Rule ${meta.ruleId} not found in worker task`)
      }

      return generateFakeStream({
        projectId,
        tableName,
        columnName: col.columnName,
        recordCnt,
        metaData: meta,
        domainName: rule.domain_name,
        locale: rule.locale ?? 'en',
        schema
      })
    }

    case 'AI': {
      if (!col.metaData || (col.metaData as AIMetaData).ruleId == null) {
        throw new Error(
          `[AI 메타데이터 오류] ${tableName}.${col.columnName} 컬럼의 AI 규칙 설정이 올바르지 않습니다.`
        )
      }

      const meta = col.metaData as AIMetaData
      const rule = rules.find((r) => r.id === meta.ruleId)
      if (!rule) {
        throw new Error(`Rule ${meta.ruleId} not found in worker task`)
      }

      return generateAIStream({
        projectId,
        tableName,
        columnName: col.columnName,
        recordCnt,
        metaData: meta,
        schema,
        database,
        rule
      })
    }

    case 'FILE': {
      if (!col.metaData) {
        throw new Error(
          `[파일 메타데이터 오류] ${tableName}.${col.columnName} 컬럼의 파일 설정이 올바르지 않습니다.`
        )
      }
      const meta = col.metaData as FileMetaData
      return createFileValueStream(meta, recordCnt)
    }

    case 'FIXED': {
      if (!col.metaData || (col.metaData as FixedMetaData).fixedValue == null) {
        throw new Error(
          `[고정값 메타데이터 오류] ${tableName}.${col.columnName} 컬럼의 고정값 설정이 올바르지 않습니다.`
        )
      }

      const meta = col.metaData as FixedMetaData
      return generateFixedStream({
        fixedValue: meta.fixedValue,
        recordCnt
      })
    }
    case 'REFERENCE': {
      if (!col.metaData) {
        throw new Error(
          `[참조 메타데이터 오류] ${tableName}.${col.columnName} 컬럼의 참조 설정이 올바르지 않습니다.`
        )
      }
      const meta = col.metaData as ReferenceMetaData
      if (!task.connection) {
        throw new Error('참조 생성은 DB 직접 연결 모드에서만 지원됩니다.')
      }

      const connectionConfig: ConnectionConfig = {
        dbType: task.dbType === 'mysql' ? 'MySQL' : 'PostgreSQL',
        host: task.connection.host,
        port: task.connection.port,
        username: task.connection.username,
        password: task.connection.password,
        database: task.connection.database
      }

      return generateReferenceStream({
        recordCnt,
        metaData: meta,
        connectionConfig
      })
    }
    default:
      throw new Error(`알 수 없는 데이터 소스: ${col.dataSource}`)
  }
}

// AI 컬럼과 non-AI 컬럼 분리
function separateColumnsByType(columns: { dataSource: DataSourceType }[]): {
  aiColumns: number[]
  nonAiColumns: number[]
} {
  const aiColumns: number[] = []
  const nonAiColumns: number[] = []

  columns.forEach((col, idx) => {
    if (col.dataSource === 'AI') {
      aiColumns.push(idx)
    } else {
      nonAiColumns.push(idx)
    }
  })

  return { aiColumns, nonAiColumns }
}

/**
 * 값 변환 (DB/스키마 문맥 기반)
 * - A안 반영: CSV 따옴표 제거는 FILE 소스일 때에만 수행
 * - undefined/null 안전, DB별 UUID, BOOL, JSON, 숫자, 날짜 처리 보강
 */
function convertValue(
  raw: string | null,
  columnName: string,
  tableName: string,
  schema: WorkerTask['schema'],
  dbType: keyof typeof DBMS_MAP,
  dataSource?: DataSourceType
): string | typeof INVALID {
  const table = schema.find((t) => t.name === tableName)
  if (!table) return INVALID

  const colSchema = table.columns.find((c) => c.name === columnName)
  if (!colSchema) return INVALID

  const type = (colSchema.type ?? '').toLowerCase()
  const notNull = Boolean(colSchema.notNull)

  // null/undefined → NULL 허용 여부 판단
  if (raw == null) return notNull ? INVALID : 'NULL'

  // 문자열화 (숫자/불리언 등 들어올 수 있음)
  let s = typeof raw === 'string' ? raw : String(raw)

  // === A안: FILE 소스일 때만 CSV 따옴표 제거 ===
  if (dataSource === 'FILE' && s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    // CSV에서 "" → " 로 복원
    s = s.slice(1, -1).replace(/""/g, '"')
  }

  // 명시적 NULL 문자열 처리
  if (s.trim().toUpperCase() === 'NULL') {
    return notNull ? INVALID : 'NULL'
  }

  // DB 함수 패스스루: now()
  if (/^\s*now\s*\(\s*\)\s*$/i.test(s)) return 'now()'

  // DB별 UUID 함수 매핑
  if (/^\s*uuid_generate_v4\s*\(\s*\)\s*$/i.test(s)) {
    return dbType === 'postgres' ? 'uuid_generate_v4()' : 'UUID()'
  }

  // 불리언
  const lower = s.trim().toLowerCase()
  const truthy = ['true', '1', 't', 'y', 'yes'].includes(lower)
  const falsy = ['false', '0', 'f', 'n', 'no'].includes(lower)
  if (type.includes('bool')) {
    if (truthy) return 'TRUE'
    if (falsy) return 'FALSE'
    return notNull ? INVALID : 'NULL'
  }

  // ENUM: 정확일치 (트림)
  if (Array.isArray(colSchema.enum) && colSchema.enum.length > 0) {
    const candidate = s.trim()
    if (!colSchema.enum.includes(candidate)) return INVALID
    return `'${candidate.replace(/'/g, "''")}'`
  }

  // 숫자: 천단위 콤마/지수 허용
  if (
    type.includes('int') ||
    type.includes('numeric') ||
    type.includes('decimal') ||
    type.includes('float') ||
    type.includes('double')
  ) {
    const cleaned = s.replace(/,/g, '').trim()
    if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(cleaned)) {
      return notNull ? INVALID : 'NULL'
    }
    return String(Number(cleaned))
  }

  // 날짜/타임스탬프: 가벼운 형태 검증
  if (type.includes('date') || type.includes('timestamp')) {
    const trimmed = s.trim()
    const looksDateish = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?/.test(trimmed)
    if (!looksDateish && trimmed.toLowerCase() !== 'now()') {
      return notNull ? INVALID : 'NULL'
    }
    return trimmed.toLowerCase() === 'now()' ? 'now()' : `'${trimmed.replace(/'/g, "''")}'`
  }

  // JSON: 칼럼 타입이 json 계열일 때만 파싱 검증
  if (type.includes('json')) {
    const candidate = s.trim()
    try {
      JSON.parse(candidate)
      return `'${candidate.replace(/'/g, "''")}'`
    } catch {
      return INVALID
    }
  }

  if (!type || type.includes('char') || type.includes('text')) {
    return `'${s.replace(/'/g, "''")}'`
  }

  // 일반 문자열
  return `'${s.replace(/'/g, "''")}'`
}

type DirectContext = {
  execute: (sql: string) => Promise<void>
  commit: () => Promise<void>
  rollback: () => Promise<void>
  close: () => Promise<void>
}

async function createDirectContext(
  dbType: keyof typeof DBMS_MAP,
  connection: NonNullable<WorkerTask['connection']>
): Promise<DirectContext> {
  if (dbType === 'mysql') {
    const client = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database
    })
    await client.beginTransaction()
    return {
      execute: async (sql: string) => {
        await client.query(sql)
      },
      commit: () => client.commit(),
      rollback: () => client.rollback(),
      close: () => client.end()
    }
  }

  const client = new PgClient({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database
  })
  await client.connect()
  await client.query('BEGIN')
  return {
    execute: async (sql: string) => {
      await client.query(sql)
    },
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    close: () => client.end()
  }
}

async function runWorker(task: WorkerTask): Promise<WorkerResult> {
  const { table, dbType, mode, connection } = task
  const { tableName, recordCnt, columns } = table

  const outputDir = path.join(process.cwd(), 'generated_sql')
  await fs.promises.mkdir(outputDir, { recursive: true })

  const sqlPath = path.join(outputDir, `${tableName}.sql`)
  await fs.promises.writeFile(sqlPath, `-- SQL for ${tableName}\n\n`, 'utf8')

  const { quote } = DBMS_MAP[dbType]
  const columnNames = columns.map((c) => `${quote}${c.columnName}${quote}`).join(', ')
  const CHUNK_SIZE = 500
  const MAX_AI_CONCURRENT = 2
  let totalFailed = 0

  const directMode = mode === 'DIRECT_DB' && Boolean(connection)
  let directContext: DirectContext | null = null

  try {
    if (directMode && connection) {
      directContext = await createDirectContext(dbType, connection)
    }

    logger.info(`[${tableName}] 시작: ${recordCnt.toLocaleString()}행, ${columns.length}컬럼`)
    let totalProcessed = 0
    const numChunks = Math.max(1, Math.ceil(recordCnt / CHUNK_SIZE))

    for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
      const chunkStart = chunkIdx * CHUNK_SIZE
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, recordCnt)
      const chunkSize = chunkEnd - chunkStart
      if (chunkSize <= 0) {
        continue
      }

      const columnStreams = columns.map((col) => createColumnStream(col, task, chunkSize))
      const { aiColumns, nonAiColumns } = separateColumnsByType(columns)
      const chunkColumnValues: (string | typeof INVALID)[][] = new Array(columns.length)

      // === Non-AI 컬럼 처리 (예외 처리 일관화) ===
      if (nonAiColumns.length > 0) {
        const nonAiResults = await Promise.all(
          nonAiColumns.map(async (colIdx) => {
            const col = columns[colIdx]
            const stream = columnStreams[colIdx]

            const values: (string | typeof INVALID)[] = []
            for (let i = 0; i < chunkSize; i++) {
              try {
                const { value } = await stream.next()
                const converted = convertValue(
                  value,
                  col.columnName,
                  tableName,
                  task.schema,
                  dbType,
                  col.dataSource
                )
                values.push(converted)
              } catch {
                values.push(INVALID)
              }
            }

            return { colIdx, values }
          })
        )

        nonAiResults.forEach(({ colIdx, values }) => {
          chunkColumnValues[colIdx] = values
        })
      }

      // === AI 컬럼 처리 (동시 MAX_AI_CONCURRENT개, 예외 처리 통일) ===
      if (aiColumns.length > 0) {
        for (let i = 0; i < aiColumns.length; i += MAX_AI_CONCURRENT) {
          const batch = aiColumns.slice(i, i + MAX_AI_CONCURRENT)

          const batchResults = await Promise.all(
            batch.map(async (colIdx) => {
              const col = columns[colIdx]
              const stream = columnStreams[colIdx]

              const values: (string | typeof INVALID)[] = []
              for (let j = 0; j < chunkSize; j++) {
                try {
                  const { value } = await stream.next()
                  const converted = convertValue(
                    value,
                    col.columnName,
                    tableName,
                    task.schema,
                    dbType,
                    col.dataSource
                  )
                  values.push(converted)
                } catch {
                  values.push(INVALID)
                }
              }

              return { colIdx, values }
            })
          )

          batchResults.forEach(({ colIdx, values }) => {
            chunkColumnValues[colIdx] = values
          })

          if (i + MAX_AI_CONCURRENT < aiColumns.length) {
            await new Promise((res) => setTimeout(res, 1000))
          }
        }
      }

      // === 행 조립 ===
      const rows: string[] = []
      const skipInvalid = task.skipInvalidRows !== false

      for (let rowIdx = 0; rowIdx < chunkSize; rowIdx++) {
        const rowValues: CellValue[] = columns.map((_, colIdx) => {
          const columnValues = chunkColumnValues[colIdx]
          return columnValues?.[rowIdx] ?? 'NULL'
        })

        const hasInvalid = rowValues.some((v) => v === INVALID)
        if (hasInvalid) {
          if (skipInvalid) {
            if (!directMode) {
              totalFailed++
            }
          } else {
            throw new Error(
              `[행 변환 오류] ${tableName} ${totalProcessed + rowIdx + 1}행 변환 실패`
            )
          }
        } else if (!directMode) {
          totalProcessed++
        }

        rows.push(`(${rowValues.join(', ')})`)
      }

      // === DIRECT_DB bulk insert + fallback ===
      if (rows.length > 0) {
        const bulkSQL = `INSERT INTO ${quote}${tableName}${quote} (${columnNames}) VALUES\n${rows.join(',\n')};`

        let successOnThisChunk = 0
        let failedOnThisChunk = 0

        if (directMode && directContext) {
          try {
            // 1) bulk insert
            await directContext.execute(bulkSQL)
            successOnThisChunk = rows.length
          } catch {
            logger.warn(`[${tableName}] bulk insert 실패 → 행 단위 fallback 실행`)

            // 2) fallback: row-by-row insert
            for (let i = 0; i < rows.length; i++) {
              const singleSQL = `INSERT INTO ${quote}${tableName}${quote} (${columnNames}) VALUES ${rows[i]};`

              try {
                await directContext.execute(singleSQL)
                successOnThisChunk++
              } catch (singleErr) {
                failedOnThisChunk++

                // UI-friendly message only
                process.parentPort.postMessage({
                  type: 'row-error',
                  tableName
                })

                // skipInvalidRows === false → 즉시 중단
                if (task.skipInvalidRows === false) {
                  throw singleErr
                }
              }
            }
          }
        }

        totalProcessed += successOnThisChunk // 성공한 row만 증가
        totalFailed += failedOnThisChunk // fallback에서 실패한 row

        await fs.promises.appendFile(sqlPath, bulkSQL + '\n', 'utf8')
      }

      process.parentPort.postMessage({
        type: 'row-progress',
        tableName,
        progress: chunkSize
      })

      await new Promise((res) => setTimeout(res, 100))
    }

    if (directContext) {
      await directContext.commit()
      await directContext.close()
      directContext = null
    }

    process.parentPort.postMessage({
      type: 'table-complete',
      tableName,
      totalRows: recordCnt,
      successRows: totalProcessed,
      failedRows: totalFailed
    })

    const result: WorkerResult = {
      tableName,
      sqlPath,
      success: true,
      directInserted: directMode ? true : undefined
    }
    process.parentPort.postMessage({ type: 'worker-result', result: result })
    return result
  } catch (err) {
    if (directContext) {
      await directContext.rollback().catch(() => {})
      await directContext.close().catch(() => {})
      directContext = null
    }

    const result: WorkerResult = {
      tableName,
      sqlPath,
      success: false,
      error: (err as Error).message
    }
    logger.error('worker-runner error:', err)
    process.parentPort.postMessage({ type: 'worker-result', result: result })
    return result
  }
}

async function main(): Promise<void> {
  process.parentPort?.once('message', async (event) => {
    try {
      const data = event.data

      if (!data || typeof data !== 'object' || data.type !== 'start') {
        logger.error('Invalid start message')
        process.exit(1)
      }

      const task = data.task as WorkerTask
      const result = await runWorker(task)

      try {
        const fd = await fs.promises.open(result.sqlPath, 'r+')
        await fd.sync()
        await fd.close()
        logger.info(`[FLUSH] ${result.tableName} flush complete`)
      } catch (e) {
        logger.warn('fsync failed:', e)
      }

      await new Promise((res) => setTimeout(res, 500))

      process.exit(result.success ? 0 : 1)
    } catch (err) {
      logger.error('worker main error: ', err)
      process.exit(1)
    }
  })
}

main()
