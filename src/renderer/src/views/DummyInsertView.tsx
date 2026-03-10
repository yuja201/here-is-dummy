import React, { useState, useEffect, useRef } from 'react'
import PageTitle from '@renderer/components/PageTitle'
import successIcon from '@renderer/assets/imgs/success.svg'
import warningIcon from '@renderer/assets/imgs/warning.svg'
import failureIcon from '@renderer/assets/imgs/failure.svg'
import Button from '@renderer/components/Button'
import { useProjectStore } from '@renderer/stores/projectStore'
import { useGenerationStore } from '@renderer/stores/generationStore'
import { useSchemaStore } from '@renderer/stores/schemaStore'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ColumnMetaData, DataSourceType, GenerationMode, GenerateRequest } from '@shared/types'

type InsertMode = 'sql' | 'db'

interface ProgressMessage {
  type:
    | 'row-progress'
    | 'column-progress'
    | 'table-complete'
    | 'all-complete'
    | 'log'
    | 'error'
    | 'row-error'
    | 'row-delta'
  progress?: number
  message?: string
  tableName?: string
  status?: 'success' | 'warning' | 'failure'
  totalCount?: number
  totalRows?: number
  successCount?: number
  failCount?: number
  failedRows?: number
  successRows?: number
  successDelta?: number
  failDelta?: number
}

const DummyInsertView: React.FC = () => {
  const location = useLocation()
  const state = location.state as {
    tables?: Array<{ id: string; name: string }>
    mode?: InsertMode
    skipInvalidRows?: boolean
  } | null

  const skipInvalidRows = state?.skipInvalidRows ?? true
  const selectedTables = React.useMemo(() => state?.tables ?? [], [state?.tables])
  const mode: InsertMode = state?.mode ?? 'sql'

  const selectedTablesRef = useRef(selectedTables)
  useEffect(() => {
    selectedTablesRef.current = selectedTables
  }, [selectedTables])

  const [progress, setProgress] = useState<number>(0)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [insertedCount, setInsertedCount] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [tables, setTables] = useState<Array<{ name: string; status: string }>>([])
  const [zipPath, setZipPath] = useState<string | null>(null)

  const logEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { selectedProject } = useProjectStore()
  const { exportAllTables } = useGenerationStore()
  const { clearAll, clearSelectedTables } = useGenerationStore()
  const { refreshSchema } = useSchemaStore()
  const [totalRows, setTotalRows] = useState(0)
  const [successRows, setSuccessRows] = useState(0)
  const [failedRows, setFailedRows] = useState(0)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    window.api.dataGenerator.onProgress((msg: unknown) => {
      const message = msg as ProgressMessage
      setLogs((prev) => [...prev, `[DEBUG] ${JSON.stringify(message) ?? ''}`])

      if (message.type === 'row-progress' && message.progress !== undefined) {
        setProgress(message.progress)
      }

      if (message.type === 'table-complete' && message.tableName) {
        const hasFail = (message.failedRows ?? 0) > 0

        setTables((prev) =>
          prev.map((t) =>
            t.name === message.tableName ? { ...t, status: hasFail ? 'failure' : 'success' } : t
          )
        )
      }

      if (message.type === 'error' && message.message) {
        setErrors((prev) => [...prev, message.message!])
      }

      if (message.type === 'all-complete') {
        setIsCompleted(true)

        // 최종 행 개수 반영 (Worker가 계산해서 보내줌)
        if (message.totalRows !== undefined) setTotalRows(message.totalRows)
        if (message.successRows !== undefined) setSuccessRows(message.successRows)
        if (message.failedRows !== undefined) setFailedRows(message.failedRows)

        const total = (message.successCount ?? 0) + (message.failCount ?? 0)
        setTotalCount(total)
        setInsertedCount(message.successCount ?? 0)

        if (mode === 'db' && selectedProject?.id) {
          refreshSchema(selectedProject.id).catch((error) => {
            window.api.logger.error('Failed to refresh schema after data insertion:', error)
          })
        }
      }
    })

    return () => {
      window.api.dataGenerator.removeProgressListeners()
    }
  }, [mode, selectedProject?.id, refreshSchema])

  useEffect(() => {
    const startGeneration = async (): Promise<void> => {
      if (!selectedProject?.id) {
        setErrors(['프로젝트가 선택되지 않았습니다.'])
        return
      }

      const allTables = exportAllTables()
      const filteredTables = allTables.filter((t) =>
        selectedTablesRef.current.some((sel) => sel.name === t.tableName)
      )

      setTables(filteredTables.map((t) => ({ name: t.tableName, status: 'pending' })))

      const generationMode: GenerationMode = mode === 'db' ? 'DIRECT_DB' : 'SQL_FILE'

      // 스키마 조회 (안전 처리)
      let schema: Array<{ name: string; columns: Array<{ name: string; notNull?: boolean }> }> = []
      try {
        const schemaResult = await window.api.schema.fetch(selectedProject.id)
        schema = schemaResult?.tables ?? []

        if (!schema.length) {
          setErrors(['스키마를 조회할 수 없습니다.'])
          return
        }
      } catch (error) {
        setErrors(['스키마 조회 중 오류 발생: ' + (error as Error).message])
        return
      }

      const payload: GenerateRequest = {
        projectId: selectedProject.id,
        mode: generationMode,
        skipInvalidRows,
        tables: filteredTables.map((tableData) => {
          const tableSchema = schema.find((s) => s.name === tableData.tableName)

          return {
            tableName: tableData.tableName,
            recordCnt: tableData.recordCnt,
            columns: tableData.columns.map((col) => {
              const columnSchema = tableSchema?.columns.find((c) => c.name === col.columnName)

              if (!columnSchema) {
                console.warn(
                  `[SCHEMA WARNING] 스키마 정보 없음 → ${tableData.tableName}.${col.columnName} → 기본값 isNullable=false 적용`
                )
              }

              return {
                columnName: col.columnName,
                dataSource: col.dataSource as DataSourceType,
                metaData: col.metaData as ColumnMetaData,
                isNullable: columnSchema ? !columnSchema.notNull : false
              }
            })
          }
        })
      }

      const result = await window.api.dataGenerator.generate(payload)

      if (result?.zipPath) setZipPath(result.zipPath)
      if (result.errors?.length) setErrors(result.errors)
    }

    startGeneration()
  }, [selectedProject, exportAllTables, mode, skipInvalidRows])

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'success':
        return successIcon
      case 'warning':
        return warningIcon
      case 'failure':
        return failureIcon
      default:
        return warningIcon
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        height: 'calc(100vh - 160px)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-background)',
        padding: '40px 60px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ marginBottom: 30 }}>
        <PageTitle
          title={
            isCompleted
              ? mode === 'sql'
                ? '더미데이터 SQL 삽입문 생성 완료'
                : '더미데이터 삽입 완료'
              : mode === 'sql'
                ? '더미데이터 SQL 삽입문 생성 중'
                : '더미데이터 삽입 중'
          }
          description={
            isCompleted
              ? '생성이 완료되었습니다.'
              : mode === 'sql'
                ? 'SQL 삽입문을 생성중입니다. 잠시만 기다려주세요.'
                : '데이터를 DB에 직접 삽입중입니다. 잠시만 기다려주세요.'
          }
        />
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1 }}>
        <div
          style={{
            width: 260,
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 16,
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <p style={{ font: 'var(--preBold18)' }}>Table List</p>
          <p style={{ font: 'var(--preRegular14)', color: 'var(--color-gray-500)' }}>
            {tables.length} table
          </p>

          <ul style={{ flex: 1, overflowY: 'auto', marginTop: 16, listStyle: 'none', padding: 0 }}>
            {tables.map((t, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={getStatusIcon(t.status)} style={{ width: 18, height: 18 }} />
                {t.name}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 16,
            padding: '30px 40px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {!isCompleted ? (
            <>
              <p style={{ font: 'var(--preBold20)', marginBottom: 8 }}>더미데이터 생성 중</p>
              <p style={{ marginBottom: 8 }}>진행률: {progress}%</p>

              <div style={{ width: '100%', height: 25, background: '#ddd', marginBottom: 20 }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-main-blue)'
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  flexShrink: 1,
                  flexBasis: '0',
                  border: '1px solid var(--color-gray-blue)',
                  borderRadius: 12,
                  padding: '20px 30px',
                  overflowY: 'auto',
                  minHeight: '200px',
                  maxHeight: '450px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
                <div ref={logEndRef} />
              </div>
            </>
          ) : (
            <>
              <p style={{ font: 'var(--preBold20)', marginBottom: 16 }}>더미데이터 생성 완료</p>
              <p style={{ marginBottom: 20 }}>
                전체 {totalCount.toLocaleString()}개 중 {insertedCount.toLocaleString()}개 완료
              </p>

              <div
                style={{
                  flex: 1,
                  flexShrink: 1,
                  flexBasis: '0',
                  border: '1px solid var(--color-gray-blue)',
                  borderRadius: 12,
                  padding: '20px 30px',
                  overflowY: 'auto',
                  marginBottom: 20,
                  minHeight: '200px',
                  maxHeight: '450px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                <p style={{ marginBottom: 20 }}>
                  총 {totalRows.toLocaleString()}개 중 {successRows.toLocaleString()}개 성공,{' '}
                  {failedRows.toLocaleString()}개 실패
                </p>
                {errors.length > 0 && (
                  <div
                    style={{
                      marginBottom: 20,
                      backgroundColor: 'var(--color-gray-50)',
                      borderLeft: '4px solid var(--color-red)',
                      padding: '12px 16px',
                      borderRadius: 8
                    }}
                  >
                    <p
                      style={{
                        color: 'var(--color-red)',
                        font: 'var(--preBold16)',
                        marginBottom: 8
                      }}
                    >
                      오류가 발생했습니다 ({errors.length}개)
                    </p>

                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 20,
                        color: 'var(--color-red)',
                        font: 'var(--preRegular14)'
                      }}
                    >
                      {errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                {mode === 'sql' && zipPath && (
                  <Button
                    variant="blue"
                    onClick={() => window.api.dataGenerator.downloadZip(zipPath)}
                  >
                    SQL문 다운로드
                  </Button>
                )}
                <Button
                  variant="gray"
                  onClick={() => {
                    clearAll()
                    clearSelectedTables()
                    navigate(`/main/dashboard/${selectedProject?.id}`)
                  }}
                >
                  완료
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DummyInsertView
