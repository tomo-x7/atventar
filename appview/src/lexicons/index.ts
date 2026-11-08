/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type Auth,
  type ErrorResult,
  type HonoXRPCOptions as XrpcOptions,
  type XRPCHono as XrpcServer,
  type HonoConfigOrHandler,
  type HonoStreamConfigOrHandler,
  createXRPCHono as createXrpcServer,
} from '@evex-dev/xrpc-hono'
import { type Env } from 'hono'
import { schemas } from './lexicons.js'
import * as WinTomoXAtventarGetActorEntries from './types/win/tomo-x/atventar/getActorEntries.js'
import * as WinTomoXAtventarGetCalendar from './types/win/tomo-x/atventar/getCalendar.js'
import * as WinTomoXAtventarGetProfile from './types/win/tomo-x/atventar/getProfile.js'
import * as WinTomoXAtventarListCalendars from './types/win/tomo-x/atventar/listCalendars.js'
import * as WinTomoXAtventarSearchCalendars from './types/win/tomo-x/atventar/searchCalendars.js'

export function createServer<E extends Env = Env>(
  options?: XrpcOptions<E>,
): Server<E> {
  return new Server<E>(options)
}

export class Server<E extends Env> {
  xrpc: XrpcServer<E>
  com: ComNS<E>
  win: WinNS<E>

  constructor(options?: XrpcOptions<E>) {
    this.xrpc = createXrpcServer<E>(schemas, options)
    this.com = new ComNS<E>(this)
    this.win = new WinNS<E>(this)
  }
}

export class ComNS<E extends Env> {
  _server: Server<E>
  atproto: ComAtprotoNS<E>

  constructor(server: Server<E>) {
    this._server = server
    this.atproto = new ComAtprotoNS<E>(server)
  }
}

export class ComAtprotoNS<E extends Env> {
  _server: Server<E>
  repo: ComAtprotoRepoNS<E>

  constructor(server: Server<E>) {
    this._server = server
    this.repo = new ComAtprotoRepoNS<E>(server)
  }
}

export class ComAtprotoRepoNS<E extends Env> {
  _server: Server<E>

  constructor(server: Server<E>) {
    this._server = server
  }
}

export class WinNS<E extends Env> {
  _server: Server<E>
  tomoX: WinTomoXNS<E>

  constructor(server: Server<E>) {
    this._server = server
    this.tomoX = new WinTomoXNS<E>(server)
  }
}

export class WinTomoXNS<E extends Env> {
  _server: Server<E>
  atventar: WinTomoXAtventarNS<E>

  constructor(server: Server<E>) {
    this._server = server
    this.atventar = new WinTomoXAtventarNS<E>(server)
  }
}

export class WinTomoXAtventarNS<E extends Env> {
  _server: Server<E>

  constructor(server: Server<E>) {
    this._server = server
  }

  getActorEntries<A extends Auth | ErrorResult = undefined>(
    cfg: HonoConfigOrHandler<
      E,
      A,
      WinTomoXAtventarGetActorEntries.QueryParams,
      WinTomoXAtventarGetActorEntries.HandlerInput,
      WinTomoXAtventarGetActorEntries.HandlerOutput
    >,
  ) {
    const nsid = 'win.tomo-x.atventar.getActorEntries'
    return this._server.xrpc.addMethod(nsid, cfg)
  }

  getCalendar<A extends Auth | ErrorResult = undefined>(
    cfg: HonoConfigOrHandler<
      E,
      A,
      WinTomoXAtventarGetCalendar.QueryParams,
      WinTomoXAtventarGetCalendar.HandlerInput,
      WinTomoXAtventarGetCalendar.HandlerOutput
    >,
  ) {
    const nsid = 'win.tomo-x.atventar.getCalendar'
    return this._server.xrpc.addMethod(nsid, cfg)
  }

  getProfile<A extends Auth | ErrorResult = undefined>(
    cfg: HonoConfigOrHandler<
      E,
      A,
      WinTomoXAtventarGetProfile.QueryParams,
      WinTomoXAtventarGetProfile.HandlerInput,
      WinTomoXAtventarGetProfile.HandlerOutput
    >,
  ) {
    const nsid = 'win.tomo-x.atventar.getProfile'
    return this._server.xrpc.addMethod(nsid, cfg)
  }

  listCalendars<A extends Auth | ErrorResult = undefined>(
    cfg: HonoConfigOrHandler<
      E,
      A,
      WinTomoXAtventarListCalendars.QueryParams,
      WinTomoXAtventarListCalendars.HandlerInput,
      WinTomoXAtventarListCalendars.HandlerOutput
    >,
  ) {
    const nsid = 'win.tomo-x.atventar.listCalendars'
    return this._server.xrpc.addMethod(nsid, cfg)
  }

  searchCalendars<A extends Auth | ErrorResult = undefined>(
    cfg: HonoConfigOrHandler<
      E,
      A,
      WinTomoXAtventarSearchCalendars.QueryParams,
      WinTomoXAtventarSearchCalendars.HandlerInput,
      WinTomoXAtventarSearchCalendars.HandlerOutput
    >,
  ) {
    const nsid = 'win.tomo-x.atventar.searchCalendars'
    return this._server.xrpc.addMethod(nsid, cfg)
  }
}
