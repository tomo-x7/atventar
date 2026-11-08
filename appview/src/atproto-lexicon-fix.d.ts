import type { lexiconDoc } from '@atproto/lexicon'

declare module '@atproto/lexicon' {
	export type LexiconDoc = typeof lexiconDoc._output & {
		$type?: 'com.atproto.lexicon.schema'
	}
}
