# クライアントの接続

## 開発

ルートで依存をインストールし、既存の AppView の開発設定と D1 のマイグレーションを用意してから起動します。

```sh
pnpm install
pnpm db:migrate:local
pnpm dev
```

Vite は `/xrpc` と `/health` をローカル AppView (`http://127.0.0.1:8787`) にプロキシします。必要な場合だけ `client/.env.example` を `client/.env.local` にコピーしてください。

- `APPVIEW_DEV_ORIGIN`: Vite のプロキシ先。ブラウザには公開しません。
- `VITE_APPVIEW_URL`: AppView のオリジン。既定はブラウザと同じオリジンです。別オリジンを指定する場合は、そのサービス側のCORS対応が必要です。
- `VITE_APP_ORIGIN`: 公開アプリのオリジン。既定は実際に開いているオリジンです。
- `VITE_OAUTH_CLIENT_ID`: 独自クライアント情報URL。既定は公開オリジンの `/oauth-client-metadata.json` です。

## 認証

`@atproto/oauth-client-browser` でログイン・復元・失効・ログアウトを扱います。HTTP の loopback 開発では SDK の loopback client ID を使い、リダイレクト先は `/auth/callback` に固定します。本番は HTTPS とし、Worker が `/oauth-client-metadata.json` を配信します。メタデータとクライアントは、カレンダーと参加登録の2コレクションに対する同じスコープを宣言します。

AtPassport は保存済みハンドルの選択にだけ使用し、その後に通常の AT Protocol OAuth 認証を行います。AtPassport の返したDIDやトークンをセッションの根拠にはしません。FedCM に対応しない場合は `/auth/atpassport/callback` へのredirectを使用します。FedCMの本番利用にはAtPassport側で公開ドメインの確認が必要になる場合があります。ドメインの登録や実ユーザーの認可操作はこの実装には含みません。

## データと画面

AppView は生成済みlexiconと `@atproto/lex` の Client で読み込みます。作成・編集・取消は OAuthSession の fetchHandler を使い、ログイン本人のPDSに書き込みます。編集時は本人のPDSから生のレコードを取得し、CIDによるCASを使います。AppViewが公開日前に省略するURLや記事参照も、元レコードから保持します。

保存成功とAppViewへの反映は別状態です。書き込んだURIとCIDが取り込まれたかを2秒間隔で最大2分自動確認し、その後も「反映を確認」で確認できます。反映確認に失敗しても、保存失敗として再送しません。取り消し後は削除済みの元レコードを読み直しません。

カレンダーの配置はサーバーが返すシート番号を使います。登録のURLはDIDとrecord keyに基づき、シート番号から独立しています。一覧APIが返さないシート枚数は推測しません。作成年と新規レコードの日時は `/health` が返すサーバー時刻に基づきます。

TanStack Router の画面は `src/app`、接続処理は `src/data`、認証は `src/auth` にあります。レイアウト・見た目は既存／追加コンポーネントの CSS Modules と共通 `theme.css` に置いています。

## 検証

```sh
pnpm --filter client test
pnpm --filter client build
pnpm --filter client build-storybook
pnpm --filter client exec playwright install chromium
pnpm --filter client test:e2e
```

手元の Chromium を使う場合は `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` に実行ファイルを指定できます。ブラウザテストでは AppView・OAuthセッション・PDSを模擬し、外部のアカウントへ書き込みません。AtPassport callback/state とPDSアクセス制限・競合・非公開URL保持は単体テストでも検証しています。
