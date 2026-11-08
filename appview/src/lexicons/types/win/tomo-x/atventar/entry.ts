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
import type * as ComAtprotoRepoStrongRef from '../../../com/atproto/repo/strongRef.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'win.tomo-x.atventar.entry'

export interface Record {
  $type: 'win.tomo-x.atventar.entry'
  /** Day of December in the referenced calendar's year. */
  day: number
  /** Public HTTP(S) URL of the article. The application must enforce the HTTP(S) scheme. Omit when unpublished. Backlink path: .url. */
  url?: string
  /** Public title or planned topic, available before the article is published. */
  title: string
  article?: ComAtprotoRepoStrongRef.Main
  comment?: string
  calendar: ComAtprotoRepoStrongRef.Main
  createdAt: string
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
