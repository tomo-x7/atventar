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
const id = 'win.tomo-x.atventar.getCalendar'

export type QueryParams = {
  /** DID-based URI of a win.tomo-x.atventar.calendar record. */
  uri: string
}
export type InputSchema = undefined

export interface OutputSchema {
  /** All indexed valid registrations for this calendar. Empty when there are no registrations. The length equals calendar.entryCount in this response. */
  entries: WinTomoXAtventarDefs.EntryView[]
  calendar: WinTomoXAtventarDefs.CalendarView
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
  error?: 'CalendarNotFound'
}

export type HandlerOutput = HandlerError | HandlerSuccess
