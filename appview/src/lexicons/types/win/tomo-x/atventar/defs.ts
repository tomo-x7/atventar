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
import type * as WinTomoXAtventarCalendar from './calendar.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'win.tomo-x.atventar.defs'

/** AppView projection of a registration and its current calendar. Keeps the public planned title and comment, but omits url and article until 00:00 Asia/Tokyo on the calendar year and entry day in December. Source records remain public. Does not include the raw source record. Calendar association uses URI identity regardless of the originally referenced CID. */
export interface EntryView {
  $type?: 'win.tomo-x.atventar.defs#entryView'
  /** CID of the complete current source record, not a hash of this projected view. */
  cid: string
  /** Day of December in the referenced calendar's year. */
  day: number
  /** DID-based URI of the current record. */
  uri: string
  /** Article HTTP(S) URL. Omitted for future scheduled days in AppView responses, even if present in the public source record. */
  url?: string
  /** Current 1-based display sheet, dynamically reassigned after joins, withdrawals or day changes. Within each day, sort by indexedAt ascending then URI ascending and assign consecutive sheet numbers starting at 1. Not stored in the participant record. */
  sheet: number
  /** Public title or planned topic, available before the article is published. */
  title: string
  author: ProfileView
  article?: ComAtprotoRepoStrongRef.Main
  comment?: string
  calendar: CalendarView
  createdAt: string
  /** Time first indexed by this AppView; preserved across record updates. */
  indexedAt: string
}

const hashEntryView = 'entryView'

export function isEntryView<V>(v: V) {
  return is$typed(v, id, hashEntryView)
}

export function validateEntryView<V>(v: V) {
  return validate<EntryView & V>(v, id, hashEntryView)
}

/** Service profile resolved by the AppView. Its source and storage are implementation details. A DID-only view is valid when display information is unavailable. */
export interface ProfileView {
  $type?: 'win.tomo-x.atventar.defs#profileView'
  did: string
  /** HTTP(S) URL of the avatar image, suitable for direct display. */
  avatar?: string
  handle?: string
  description?: string
  displayName?: string
}

const hashProfileView = 'profileView'

export function isProfileView<V>(v: V) {
  return is$typed(v, id, hashProfileView)
}

export function validateProfileView<V>(v: V) {
  return validate<ProfileView & V>(v, id, hashProfileView)
}

/** Current calendar record with AppView metadata. */
export interface CalendarView {
  $type?: 'win.tomo-x.atventar.defs#calendarView'
  /** CID of the current record. */
  cid: string
  /** DID-based URI of the current record. */
  uri: string
  author: ProfileView
  record: WinTomoXAtventarCalendar.Main
  /** Time first indexed by this AppView; preserved across record updates. */
  indexedAt: string
  /** Total number of currently indexed valid registrations, across all days. */
  entryCount: number
}

const hashCalendarView = 'calendarView'

export function isCalendarView<V>(v: V) {
  return is$typed(v, id, hashCalendarView)
}

export function validateCalendarView<V>(v: V) {
  return validate<CalendarView & V>(v, id, hashCalendarView)
}
