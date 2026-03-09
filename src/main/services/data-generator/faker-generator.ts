import { fakerMapper } from '../../utils/faker-mapper'
import type { FakerMetaData } from '@shared/types'
import type { Table, Column as SchemaColumn } from '../../database/types'
import { Faker, fakerEN, fakerKO } from '@faker-js/faker'

const LOCALE_FAKERS = {
  en: fakerEN,
  ko: fakerKO
} as const

type FakerOptions = { min: number; max: number } | Record<string, unknown> | undefined

/**
 * Faker 생성 요청 파라미터
 */
export interface FakerGenerateRequest {
  projectId: number
  tableName: string
  columnName: string
  recordCnt: number
  metaData: FakerMetaData
  domainName: string
  locale: string
  schema: Table[]
}

/**
 * 숫자 범위 및 문자열 길이 제약 추출
 */
function extractSimpleConstraints(
  sqlType: string,
  columnData: SchemaColumn
): {
  min?: number
  max?: number
  maxLength?: number
} {
  const constraints: { min?: number; max?: number; maxLength?: number } = {}

  // 스키마에서 직접 전달된 제약이 있으면 최우선 사용
  if (columnData.minValue !== undefined) constraints.min = columnData.minValue
  if (columnData.maxValue !== undefined) constraints.max = columnData.maxValue
  if (columnData.maxLength !== undefined) constraints.maxLength = columnData.maxLength

  // 문자열 타입 정규식 기반 백업
  if (!constraints.maxLength) {
    const lengthMatch = sqlType.match(/\((\d+)\)/)
    if (lengthMatch) {
      constraints.maxLength = parseInt(lengthMatch[1], 10)
    }
  }

  // CHECK 제약이 있다면 추가로 반영
  if (columnData.check) {
    const checkStr = columnData.check
    const minMatch = checkStr.match(/>=?\s*(-?\d+(\.\d+)?)/)
    const maxMatch = checkStr.match(/<=?\s*(-?\d+(\.\d+)?)/)

    // CHECK 제약을 스키마 제약과 병합
    if (minMatch) {
      const checkMin = Number(minMatch[1])
      constraints.min =
        constraints.min !== undefined ? Math.max(constraints.min, checkMin) : checkMin
    }

    if (maxMatch) {
      const checkMax = Number(maxMatch[1])
      constraints.max =
        constraints.max !== undefined ? Math.min(constraints.max, checkMax) : checkMax
    }
  }

  return constraints
}

/**
 * faker 스트리밍 생성기
 * - CHECK 제약조건(min/max)과 문자열 길이(maxLength)만 고려
 */
export async function* generateFakeStream({
  tableName,
  columnName,
  recordCnt,
  schema,
  domainName,
  locale,
  metaData
}: FakerGenerateRequest): AsyncGenerator<string, void, unknown> {
  // 스키마에서 테이블/컬럼 찾기
  const table = schema.find((t) => t.name === tableName)
  const column = table?.columns.find((c) => c.name === columnName)

  const sqlType = column?.type ?? 'VARCHAR(255)'
  const { min, max, maxLength } = column ? extractSimpleConstraints(sqlType, column) : {}

  const localeKey = locale ?? 'en'
  const faker = LOCALE_FAKERS[localeKey] ?? LOCALE_FAKERS.en
  // faker 경로 매핑
  const fakerPath = fakerMapper[domainName]
  if (!fakerPath) {
    throw new Error(`No faker mapping for domain: ${domainName}`)
  }
  const [category, method, optionName, optionValue] = fakerPath.split('.') as [
    keyof Faker,
    string,
    string?,
    string?
  ]
  const fakerCategory = faker[category]
  const fn = (fakerCategory as Record<string, unknown>)[method]
  let opts: FakerOptions = undefined

  if (optionName && optionValue) {
    const parsedValue = Number(optionValue)
    opts = {
      [optionName]: Number.isNaN(parsedValue) ? optionValue : parsedValue
    }
  }

  if (typeof fn !== 'function') {
    throw new Error(`❌ Invalid faker path: ${fakerPath}`)
  }

  // 단일 값을 생성하는 헬퍼 함수
  const generateSingleValue = (): string => {
    // 숫자 범위 제약
    if (
      typeof min === 'number' &&
      typeof max === 'number' &&
      /INT|DECIMAL|NUMERIC|FLOAT|DOUBLE/i.test(sqlType)
    ) {
      opts = { min, max }
    }

    const raw = opts ? fn(opts) : fn()

    // 날짜 처리
    if (/DATE|DATETIME|TIMESTAMP/i.test(sqlType)) {
      if (raw instanceof Date) {
        const year = raw.getFullYear()
        const month = String(raw.getMonth() + 1).padStart(2, '0')
        const day = String(raw.getDate()).padStart(2, '0')
        const hours = String(raw.getHours()).padStart(2, '0')
        const minutes = String(raw.getMinutes()).padStart(2, '0')
        const seconds = String(raw.getSeconds()).padStart(2, '0')

        if (/^DATE$/i.test(sqlType)) {
          return `${year}-${month}-${day}`
        }

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
      }

      return String(raw)
    }

    // 문자열 길이
    if (typeof maxLength === 'number') {
      return String(raw).slice(0, maxLength)
    }

    return String(raw)
  }

  // 고유값 보장이 필요 없는 경우
  if (!metaData.ensureUnique) {
    for (let i = 0; i < recordCnt; i++) {
      yield generateSingleValue()
      if (i > 0 && i % 100_000 === 0) {
        await new Promise((res) => setTimeout(res, 10))
      }
    }
    return
  }

  // 고유값 보장이 필요한 경우
  const generatedValues = new Set<string>()
  const MAX_RETRIES = recordCnt * 3 + 100 // 재시도 횟수

  for (let i = 0; i < recordCnt; i++) {
    let value: string
    let retries = 0

    do {
      value = generateSingleValue()
      if (retries++ > MAX_RETRIES) {
        console.warn(`[${tableName}.${columnName}] 고유값 생성 재시도 횟수 초과.      
       임의의 값을 생성합니다.`)
        value = `${value}_${Date.now()}_${Math.random()}`
        break // do-while 루프 탈출
      }
    } while (generatedValues.has(value))

    generatedValues.add(value)
    yield value

    if (i > 0 && i % 100_000 === 0) {
      await new Promise((res) => setTimeout(res, 10))
    }
  }
}
