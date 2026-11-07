# client

React + TypeScript + Vite のクライアントです。
セットアップは[ルートの README](../README.md)を参照してください。

```sh
pnpm storybook       # http://localhost:6006
pnpm build-storybook # storybook-static に出力
pnpm build
pnpm lint
```

## コンポーネント

`src/components/index.ts` から UI と型を公開しています。CSS は各コンポーネントで読み込むため、アプリのグローバル CSS は不要です。

| ディレクトリ | UI |
| --- | --- |
| `advent-calendar` | 25日分のカレンダー、1企画に複数枚表示、参加枠、公開記事、公開待ち、閲覧のみ |
| `calendar-directory` | 一覧、検索、年選択、並べ替え、募集中、追加表示、過去年、ユーザーの参加・主催・記事 |
| `calendar-forms` | 作成・編集・削除、参加・記事登録・取消、ログイン・プロフィール・退会 |
| `calendar-management` | 枚数追加、名前変更、空カレンダー削除、主催者による参加登録の管理 |
| `service-shell` | ヘッダー、ログイン状態、ヘルプ、読み込み中、取得エラー、見つからない状態 |

Storybook の各画面は独立しています。既存の `App.tsx` は変更せず、API・認証・永続化・ルーティングは追加していません。選択や保存はコールバックで受け取り、操作の例は Story 内のローカル状態で示しています。フォームの状態制御については[フォームの README](src/components/calendar-forms/README.md)を参照してください。

複数枚のカレンダーは `CalendarCollection` の `sheets: CalendarSheet[]` で渡します。各枚は独立した ID と1〜25日の参加登録を持ちます。日付の重複は枚ごとに扱い、追加操作で既存の枚を置き換えません。登録のある枚は管理画面から削除できません。

58 の Story に、空・満員・長文・モバイル・送信中・エラーを含めています。`play` で検索、枚数追加、参加、保存、削除確認などを確認でき、a11y addon でアクセシビリティを検査できます。

画面構成の参考: [Adventar](https://adventar.org/)、[過去のカレンダー](https://adventar.org/archive)、[ヘルプ](https://adventar.org/help)。サンプルのカレンダー・参加者・記事は架空のデータです。

lint・format はルートの Biome 共通設定を使います。`pnpm dev` / `pnpm preview` は既存の Vite アプリを起動します。今回の UI は `pnpm storybook` で確認してください。
