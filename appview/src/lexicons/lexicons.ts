/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  ComAtprotoRepoStrongRef: {
    id: 'com.atproto.repo.strongRef',
    defs: {
      main: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
    description: 'A URI with a content-hash fingerprint.',
  },
  WinTomoXAtventarCalendar: {
    id: 'win.tomo-x.atventar.calendar',
    defs: {
      main: {
        key: 'tid',
        type: 'record',
        record: {
          type: 'object',
          required: ['title', 'year', 'createdAt'],
          properties: {
            year: {
              type: 'integer',
              maximum: 9999,
              minimum: 1,
            },
            title: {
              type: 'string',
              maxLength: 1000,
              minLength: 1,
              maxGraphemes: 100,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            description: {
              type: 'string',
              maxLength: 30000,
              maxGraphemes: 3000,
            },
          },
        },
        description:
          'An Advent calendar for December 1 through 25. The repository owner is the organizer.',
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
  },
  WinTomoXAtventarDefs: {
    id: 'win.tomo-x.atventar.defs',
    defs: {
      entryView: {
        type: 'object',
        required: [
          'uri',
          'cid',
          'author',
          'calendar',
          'day',
          'title',
          'createdAt',
          'indexedAt',
          'sheet',
        ],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
            description:
              'CID of the complete current source record, not a hash of this projected view.',
          },
          day: {
            type: 'integer',
            maximum: 25,
            minimum: 1,
            description: "Day of December in the referenced calendar's year.",
          },
          uri: {
            type: 'string',
            format: 'at-uri',
            description: 'DID-based URI of the current record.',
          },
          url: {
            type: 'string',
            format: 'uri',
            maxLength: 8192,
            description:
              'Article HTTP(S) URL. Omitted for future scheduled days in AppView responses, even if present in the public source record.',
          },
          sheet: {
            type: 'integer',
            minimum: 1,
            description:
              'Current 1-based display sheet, dynamically reassigned after joins, withdrawals or day changes. Within each day, sort by indexedAt ascending then URI ascending and assign consecutive sheet numbers starting at 1. Not stored in the participant record.',
          },
          title: {
            type: 'string',
            maxLength: 2000,
            minLength: 1,
            description:
              'Public title or planned topic, available before the article is published.',
            maxGraphemes: 200,
          },
          author: {
            ref: 'lex:win.tomo-x.atventar.defs#profileView',
            type: 'ref',
            description:
              'Profile of the repository owner. author.did identifies the record author.',
          },
          article: {
            ref: 'lex:com.atproto.repo.strongRef',
            type: 'ref',
            description:
              'Article record strongRef. Omitted for future scheduled days in AppView responses, even if present in the public source record.',
          },
          comment: {
            type: 'string',
            maxLength: 10000,
            maxGraphemes: 1000,
          },
          calendar: {
            ref: 'lex:win.tomo-x.atventar.defs#calendarView',
            type: 'ref',
          },
          createdAt: {
            type: 'string',
            format: 'datetime',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
            description:
              'Time first indexed by this AppView; preserved across record updates.',
          },
        },
        description:
          'AppView projection of a registration and its current calendar. Keeps the public planned title and comment, but omits url and article until 00:00 Asia/Tokyo on the calendar year and entry day in December. Source records remain public. Does not include the raw source record. Calendar association uses URI identity regardless of the originally referenced CID.',
      },
      profileView: {
        type: 'object',
        required: ['did'],
        properties: {
          did: {
            type: 'string',
            format: 'did',
          },
          avatar: {
            type: 'string',
            format: 'uri',
            description:
              'HTTP(S) URL of the avatar image, suitable for direct display.',
          },
          handle: {
            type: 'string',
            format: 'handle',
          },
          description: {
            type: 'string',
            maxLength: 25600,
            maxGraphemes: 2560,
          },
          displayName: {
            type: 'string',
            maxLength: 640,
            maxGraphemes: 64,
          },
        },
        description:
          'Service profile resolved by the AppView. Its source and storage are implementation details. A DID-only view is valid when display information is unavailable.',
      },
      calendarView: {
        type: 'object',
        required: ['uri', 'cid', 'author', 'record', 'indexedAt', 'entryCount'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
            description: 'CID of the current record.',
          },
          uri: {
            type: 'string',
            format: 'at-uri',
            description: 'DID-based URI of the current record.',
          },
          author: {
            ref: 'lex:win.tomo-x.atventar.defs#profileView',
            type: 'ref',
            description:
              'Profile of the repository owner. author.did identifies the record author.',
          },
          record: {
            ref: 'lex:win.tomo-x.atventar.calendar',
            type: 'ref',
          },
          indexedAt: {
            type: 'string',
            format: 'datetime',
            description:
              'Time first indexed by this AppView; preserved across record updates.',
          },
          entryCount: {
            type: 'integer',
            minimum: 0,
            description:
              'Total number of currently indexed valid registrations, across all days.',
          },
        },
        description: 'Current calendar record with AppView metadata.',
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
  },
  WinTomoXAtventarEntry: {
    id: 'win.tomo-x.atventar.entry',
    defs: {
      main: {
        key: 'tid',
        type: 'record',
        record: {
          type: 'object',
          required: ['calendar', 'day', 'title', 'createdAt'],
          properties: {
            day: {
              type: 'integer',
              maximum: 25,
              minimum: 1,
              description: "Day of December in the referenced calendar's year.",
            },
            url: {
              type: 'string',
              format: 'uri',
              maxLength: 8192,
              description:
                'Public HTTP(S) URL of the article. The application must enforce the HTTP(S) scheme. Omit when unpublished. Backlink path: .url.',
            },
            title: {
              type: 'string',
              maxLength: 2000,
              minLength: 1,
              description:
                'Public title or planned topic, available before the article is published.',
              maxGraphemes: 200,
            },
            article: {
              ref: 'lex:com.atproto.repo.strongRef',
              type: 'ref',
              description:
                "Optional reference to the article's AT Protocol record, of any collection. Use a DID-based record URI. May coexist with url. Backlink path: .article.uri.",
            },
            comment: {
              type: 'string',
              maxLength: 10000,
              maxGraphemes: 1000,
            },
            calendar: {
              ref: 'lex:com.atproto.repo.strongRef',
              type: 'ref',
              description:
                'Reference to a win.tomo-x.atventar.calendar record. Use a DID-based record URI. Backlink path: .calendar.uri.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
        description:
          "A participant's registration for a day in an Advent calendar. The repository owner is the participant. URL and article reference may be provided independently or together, or omitted before publication.",
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
  },
  WinTomoXAtventarGetActorEntries: {
    id: 'win.tomo-x.atventar.getActorEntries',
    defs: {
      main: {
        type: 'query',
        errors: [
          {
            name: 'InvalidCursor',
            description:
              'The cursor is malformed, expired, or does not match the request filters and limit.',
          },
        ],
        output: {
          schema: {
            type: 'object',
            required: ['entries'],
            properties: {
              cursor: {
                type: 'string',
                description: 'Present only when another page is available.',
              },
              entries: {
                type: 'array',
                items: {
                  ref: 'lex:win.tomo-x.atventar.defs#entryView',
                  type: 'ref',
                },
                maxLength: 100,
              },
            },
          },
          encoding: 'application/json',
        },
        parameters: {
          type: 'params',
          required: ['actor'],
          properties: {
            year: {
              type: 'integer',
              maximum: 9999,
              minimum: 1,
            },
            actor: {
              type: 'string',
              format: 'at-identifier',
              description:
                'Participant DID or handle; resolve handles to DIDs before filtering.',
            },
            limit: {
              type: 'integer',
              default: 50,
              maximum: 100,
              minimum: 1,
            },
            cursor: {
              type: 'string',
              maxLength: 4096,
              description:
                'Opaque continuation cursor. Reuse the same filters and limit; omit for the first page.',
            },
          },
        },
        description:
          "List a participant's registrations, newest first by indexedAt, then URI ascending. An optional year filters the referenced calendar's year. Uses the same future-day article filtering and dynamic sheet assignment as getCalendar, including when requesting the caller's own registrations.",
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
  },
  WinTomoXAtventarGetCalendar: {
    id: 'win.tomo-x.atventar.getCalendar',
    defs: {
      main: {
        type: 'query',
        errors: [
          {
            name: 'CalendarNotFound',
            description:
              'The requested calendar is not indexed or is no longer available.',
          },
        ],
        output: {
          schema: {
            type: 'object',
            required: ['calendar', 'entries'],
            properties: {
              entries: {
                type: 'array',
                items: {
                  ref: 'lex:win.tomo-x.atventar.defs#entryView',
                  type: 'ref',
                },
                description:
                  'All indexed valid registrations for this calendar. Empty when there are no registrations. The length equals calendar.entryCount in this response.',
              },
              calendar: {
                ref: 'lex:win.tomo-x.atventar.defs#calendarView',
                type: 'ref',
              },
            },
          },
          encoding: 'application/json',
        },
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
              description:
                'DID-based URI of a win.tomo-x.atventar.calendar record.',
            },
          },
        },
        description:
          'Get the current calendar and all its indexed valid registrations across every day and sheet. Entries are ordered by day ascending, indexedAt ascending, then URI ascending. Match calendar membership by URI regardless of the originally referenced CID. This response is not paginated. Future-day registrations remain in the response, but their article URLs and article record references are omitted. Display sheet numbers are dynamically reassigned.',
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
  },
  WinTomoXAtventarGetProfile: {
    id: 'win.tomo-x.atventar.getProfile',
    defs: {
      main: {
        type: 'query',
        errors: [
          {
            name: 'ActorNotFound',
            description:
              'The requested identity does not exist or cannot be resolved.',
          },
        ],
        output: {
          schema: {
            ref: 'lex:win.tomo-x.atventar.defs#profileView',
            type: 'ref',
          },
          encoding: 'application/json',
        },
        parameters: {
          type: 'params',
          required: ['actor'],
          properties: {
            actor: {
              type: 'string',
              format: 'at-identifier',
              description: 'DID or handle of the requested profile.',
            },
          },
        },
        description:
          'Resolve a DID or handle to the service profile. Profile source and storage are implementation details. Return a DID-only profile when the identity exists but display information is unavailable.',
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
  },
  WinTomoXAtventarListCalendars: {
    id: 'win.tomo-x.atventar.listCalendars',
    defs: {
      main: {
        type: 'query',
        errors: [
          {
            name: 'InvalidCursor',
            description:
              'The cursor is malformed, expired, or does not match the request filters and limit.',
          },
        ],
        output: {
          schema: {
            type: 'object',
            required: ['calendars'],
            properties: {
              cursor: {
                type: 'string',
                description: 'Present only when another page is available.',
              },
              calendars: {
                type: 'array',
                items: {
                  ref: 'lex:win.tomo-x.atventar.defs#calendarView',
                  type: 'ref',
                },
                maxLength: 100,
              },
            },
          },
          encoding: 'application/json',
        },
        parameters: {
          type: 'params',
          properties: {
            year: {
              type: 'integer',
              maximum: 9999,
              minimum: 1,
            },
            limit: {
              type: 'integer',
              default: 50,
              maximum: 100,
              minimum: 1,
            },
            author: {
              type: 'string',
              format: 'at-identifier',
              description:
                'Organizer DID or handle; resolve handles to DIDs before filtering.',
            },
            cursor: {
              type: 'string',
              maxLength: 4096,
              description:
                'Opaque continuation cursor. Reuse the same filters and limit; omit for the first page.',
            },
          },
        },
        description:
          'List indexed calendars, newest first by indexedAt, then URI ascending. All supplied filters are combined with AND.',
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
  },
  WinTomoXAtventarSearchCalendars: {
    id: 'win.tomo-x.atventar.searchCalendars',
    defs: {
      main: {
        type: 'query',
        errors: [
          {
            name: 'InvalidCursor',
            description:
              'The cursor is malformed, expired, or does not match the request filters and limit.',
          },
        ],
        output: {
          schema: {
            type: 'object',
            required: ['calendars'],
            properties: {
              cursor: {
                type: 'string',
                description: 'Present only when another page is available.',
              },
              calendars: {
                type: 'array',
                items: {
                  ref: 'lex:win.tomo-x.atventar.defs#calendarView',
                  type: 'ref',
                },
                maxLength: 100,
              },
            },
          },
          encoding: 'application/json',
        },
        parameters: {
          type: 'params',
          required: ['q'],
          properties: {
            q: {
              type: 'string',
              maxLength: 1000,
              minLength: 1,
              description:
                'Non-blank search text. Trim surrounding whitespace and reject an empty result with InvalidRequest.',
              maxGraphemes: 100,
            },
            year: {
              type: 'integer',
              maximum: 9999,
              minimum: 1,
            },
            limit: {
              type: 'integer',
              default: 50,
              maximum: 100,
              minimum: 1,
            },
            author: {
              type: 'string',
              format: 'at-identifier',
              description:
                'Organizer DID or handle; resolve handles to DIDs before filtering.',
            },
            cursor: {
              type: 'string',
              maxLength: 4096,
              description:
                'Opaque continuation cursor. Reuse the same filters and limit; omit for the first page.',
            },
          },
        },
        description:
          'Search calendar titles and descriptions. All supplied filters are combined with AND. Order by relevance descending then URI ascending. Search matching and relevance ranking are implementation details; the cursor is bound to the query and filters.',
      },
    },
    $type: 'com.atproto.lexicon.schema',
    lexicon: 1,
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas: LexiconDoc[] = Object.values(schemaDict)
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  ComAtprotoRepoStrongRef: 'com.atproto.repo.strongRef',
  WinTomoXAtventarCalendar: 'win.tomo-x.atventar.calendar',
  WinTomoXAtventarDefs: 'win.tomo-x.atventar.defs',
  WinTomoXAtventarEntry: 'win.tomo-x.atventar.entry',
  WinTomoXAtventarGetActorEntries: 'win.tomo-x.atventar.getActorEntries',
  WinTomoXAtventarGetCalendar: 'win.tomo-x.atventar.getCalendar',
  WinTomoXAtventarGetProfile: 'win.tomo-x.atventar.getProfile',
  WinTomoXAtventarListCalendars: 'win.tomo-x.atventar.listCalendars',
  WinTomoXAtventarSearchCalendars: 'win.tomo-x.atventar.searchCalendars',
} as const
