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

const is$typed = _is$typed,
  validate = _validate
const id = 'win.tomo-x.atventar.calendar'

export interface Record {
  $type: 'win.tomo-x.atventar.calendar'
  year: number
  title: string
  createdAt: string
  description?: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

/** A reference to the Advent calendar represented by a site.standard.document record. */
export interface DocumentContent {
  $type?: 'win.tomo-x.atventar.calendar#documentContent'
  /** DID-based AT URI of the win.tomo-x.atventar.calendar record. Independent of calendar sheet numbers. */
  calendar: string
}

const hashDocumentContent = 'documentContent'

export function isDocumentContent<V>(v: V) {
  return is$typed(v, id, hashDocumentContent)
}

export function validateDocumentContent<V>(v: V) {
  return validate<DocumentContent & V>(v, id, hashDocumentContent)
}
