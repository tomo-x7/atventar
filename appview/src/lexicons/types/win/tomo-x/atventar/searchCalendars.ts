/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons.js'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util.js'
import type * as WinTomoXAtventarDefs from './defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'win.tomo-x.atventar.searchCalendars'

export type QueryParams = {
  /** Non-blank search text. Trim surrounding whitespace and reject an empty result with InvalidRequest. */
  q: string
  year?: number
  limit: number
  /** Organizer DID or handle; resolve handles to DIDs before filtering. */
  author?: string
  /** Opaque continuation cursor. Reuse the same filters and limit; omit for the first page. */
  cursor?: string
}
export type InputSchema = undefined

export interface OutputSchema {
  /** Present only when another page is available. */
  cursor?: string
  calendars: WinTomoXAtventarDefs.CalendarView[]
}

export type HandlerInput = undefined

export interface HandlerSuccess {
  encoding: 'application/json'
  body: OutputSchema
  headers?: { [key: string]: string }
}

export interface HandlerError {
  status: number
  message?: string
  error?: 'InvalidCursor'
}

export type HandlerOutput = HandlerError | HandlerSuccess
