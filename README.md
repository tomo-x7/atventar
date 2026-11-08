# atventar

pnpm workspaceで管理するモノレポです。Node.js 24以上とpnpm 11.21.0を使用します。

```text
client/    React + Vite（既存構成）
appview/   Hono + Node.js
shared/    既存サブモジュール（workspace・チェックの対象外）
```

## 開発

```sh
pnpm install
pnpm dev
```

clientはViteの既定ポート（5173）、appviewは`http://127.0.0.1:3000`で起動します。
appviewの疎通確認は`GET /health`です。両方ともファイルの変更を監視します。

環境変数を変更する場合は`appview/.env.example`を`appview/.env`にコピーしてください。
`.env`はappviewの開発・本番起動時に読み込まれます。外部から接続する場合は`HOST=0.0.0.0`を指定します。
clientからAPIを呼ぶ際のプロキシ・CORS設定は、実際のAPI実装に合わせて追加してください。

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 全アプリを並列起動 |
| `pnpm dev:client` | clientのみ起動 |
| `pnpm dev:appview` | appviewのみ起動 |
| `pnpm check` | lint・フォーマット検証と型チェック |
| `pnpm format` | Biome対象のファイルを整形 |
| `pnpm build` | 全アプリをビルド |
| `pnpm --filter @atventar/appview start` | ビルド済みappviewを起動 |

## 構成の方針

- clientのアプリ構成は維持し、lint・formatをappviewと共通のBiomeに統一しています。
- Biomeは**2.2.3固定**で、sharedのみ対象から除外しています。
- appviewは`src/app.ts`にHonoアプリ、`src/index.ts`にNode.jsの起動処理を分けています。
  ルートを増やすときは`app.ts`から登録してください。業務ロジックやDBはまだありません。
- TypeScript設定はclient・appviewそれぞれのディレクトリ内で管理します。
- 依存関係とlockfileはルートで管理します。追加例: `pnpm --filter @atventar/appview add <package>`。
- CIではlockfile固定のインストール、`pnpm check`、`pnpm build`を実行します。
- sharedの初期化は今回の開発・CIには不要です。必要な場合のみ`git submodule update --init shared`を実行します。

HonoのNode.js構成は[公式ドキュメント](https://hono.dev/docs/getting-started/nodejs)、workspaceは[pnpmのドキュメント](https://pnpm.io/workspaces)を参照しています。
