# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) にガイダンスを提供します。

## 開発コマンド

### ビルドとテスト
- `pnpm build` - tsupを使用してCLIをビルド
- `pnpm test` - Vitestですべてのテストを実行
- `pnpm fmt` - Prettierでコードをフォーマット

### 特定コンポーネントのテスト
- `pnpm test generate.spec.ts` - 生成パイプラインのテスト
- `pnpm test transform.spec.ts` - スキーマ変換のテスト
- `pnpm test typescript-generation.spec.ts` - TypeScript出力のテスト

### サンプルアプリ
- `cd example && pnpm dev` - 生成されたモックをテストするためのVite開発サーバーを実行

## コアアーキテクチャ

### データパイプラインフロー
```
OpenAPI Spec → swagger.ts → generate.ts → transform.ts → template.ts → 出力ファイル
```

### 主要モジュール
- **`cli.ts`**: CLI解析に`cac`を使用するエントリーポイント
- **`swagger.ts`**: `swagger2openapi`と`@apidevtools/swagger-parser`を使用したOpenAPIスペック解析
- **`generate.ts`**: メインオーケストレーション、操作抽出、参照解決
- **`transform.ts`**: スマートフィールド検出を使用したスキーマからFaker.jsコード変換
- **`template.ts`**: MSWハンドラー生成とAIプロバイダー統合

### 出力構造
4つのファイルを生成: `handlers.js/ts`（メイン）、`browser.js/ts`、`node.js/ts`、`native.js/ts`

### AI統合
- 統一AI SDKを通じてOpenAI、Azure、Anthropicをサポート
- cosmiconfig（package.jsonまたは独立設定ファイル）による設定
- 有効化時にFaker.jsをAI生成データで置換
- 設定例は`example/package.json`を参照

## 重要な技術パターン

### スキーマ参照解決
- 循環依存検出を含む再帰的解決を使用
- 解決チェーンを追跡するための`resolvingRefs`スタックを維持
- `autoPopRefs`ヘルパー関数による自動クリーンアップ
- 循環参照の適切な処理（空オブジェクトを返す）

### モックデータ生成モード
- **Dynamic**: ランタイム実行のためのFaker.jsコードを生成
- **Static**: VMコンテキスト評価を使用したデータの事前生成
- 命名パターンに基づくスマートフィールド認識（`_at` → 日付、`id` → UUID など）

### APIカウンターシステム
- エンドポイントカウンターを使用したラウンドロビンレスポンス選択
- ステータスコードの循環のための操作からコール数へのマッピング
- カウンターオーバーフロー保護の処理

## テストパターン

### テスト構造
- 個別関数の単体テスト（`transform.spec.ts`、`utils.spec.ts`）
- フルパイプラインの統合テスト（`generate.spec.ts`）
- ファイルシステム検証を含むE2Eテスト（`typescript-generation.spec.ts`）

### 主要テスト手法
- `test/fixture/`内のフィクスチャファイル（YAML OpenAPIスペック）を使用
- 生成コードテストのための`eval()`を使用したモック評価
- 統合テストでのファイルクリーンアップフック
- 静的および動的生成モードの両方をテスト

## 設定システム

柔軟な設定読み込みのために`cosmiconfig`を使用:
- Package.jsonフィールド: `"msw-auto-mock": {...}`
- 独立ファイル: `.msw-auto-mockrc`、`.msw-auto-mockrc.json`など
- CLIオプションとファイルベース設定のマージ

## 依存関係とツール

### ランタイム依存関係
- `@apidevtools/swagger-parser`: OpenAPI処理
- `cac`: CLIフレームワーク
- `cosmiconfig`: 設定読み込み
- `lodash`: ユーティリティ（camelCase、merge、get、keys）
- `ai` + AI SDKパッケージ: AIプロバイダー統合
- `ts-pattern`: AIプロバイダーのパターンマッチング

### ビルドツール
- `tsup`: 高速TypeScriptバンドラー（CommonJS出力）
- `prettier`: コードフォーマッティング（120文字行幅）
- `lefthook`: プリコミットフォーマッティング用Gitフック
- `vitest`: テストランナー

## 開発ガイドライン

### スキーマ解決を変更する場合
- 循環参照処理を常にテスト
- スタック管理に`autoPopRefs`ヘルパーを使用
- シンプルなスキーマパターンと複雑なスキーマパターンの両方をチェック

### 新しい変換を追加する場合
- `transform.ts`内の既存のスマートフィールド検出パターンに従う
- TypeScriptとJavaScript出力の両方をテスト
- 静的および動的生成モードを確認

### AI統合を扱う場合
- cosmiconfigでの設定読み込みをテスト
- 3つのプロバイダー（OpenAI、Azure、Anthropic）すべてを確認
- 静的生成のキャッシュ動作をチェック

### コード品質
- 既存のPrettier設定に従う
- EditorConfig設定を使用（2スペース、LF行末）
- コミット前に`pnpm fmt`を実行
- TypeScript strict modeの準拠を維持