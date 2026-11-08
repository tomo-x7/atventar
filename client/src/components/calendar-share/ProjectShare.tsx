import { useId, useState } from 'react'
import './project-share.css'

export interface ProjectShareContent {
	projectName: string
	year: number
	projectHref: string
	isParticipant?: boolean
	day?: number
	recordHref?: string
}

export interface ProjectSharePayload {
	text: string
	url: string
}

export interface ProjectShareProps extends ProjectShareContent {
	onShare?: (payload: ProjectSharePayload) => void | Promise<void>
}

export function buildProjectShare({
	projectName,
	year,
	projectHref,
	isParticipant,
	day,
	recordHref,
}: ProjectShareContent): ProjectSharePayload {
	const url = isParticipant && recordHref ? recordHref : projectHref
	const participation = isParticipant
		? Number.isInteger(day) && day !== undefined && day >= 1 && day <= 25
			? `12月${day}日に参加します。`
			: '参加します。'
		: undefined
	return { text: [`${projectName} ${year}`, participation, url].filter(Boolean).join('\n'), url }
}

export function ProjectShare({ onShare, ...content }: ProjectShareProps) {
	const id = useId()
	const payload = buildProjectShare(content)
	const [result, setResult] = useState<{ text: string; message: string } | null>(null)
	const [pending, setPending] = useState(false)
	async function copy() {
		setPending(true)
		setResult(null)
		try {
			await navigator.clipboard.writeText(payload.text)
			setResult({ text: payload.text, message: 'コピーしました' })
		} catch {
			setResult({ text: payload.text, message: 'コピーできませんでした' })
		} finally {
			setPending(false)
		}
	}
	async function share() {
		if (!onShare) return
		setPending(true)
		setResult(null)
		try {
			await onShare(payload)
			setResult({ text: payload.text, message: '共有しました' })
		} catch (error) {
			if (!(error instanceof Error && error.name === 'AbortError'))
				setResult({ text: payload.text, message: '共有できませんでした' })
		} finally {
			setPending(false)
		}
	}
	return (
		<section className="project-share" aria-labelledby={`${id}-heading`}>
			<h2 id={`${id}-heading`}>共有</h2>
			<label htmlFor={`${id}-text`}>共有文</label>
			<textarea id={`${id}-text`} readOnly value={payload.text} rows={content.isParticipant ? 4 : 3} />
			<div className="project-share-actions">
				<button type="button" onClick={copy} disabled={pending}>
					コピー
				</button>
				{onShare && (
					<button type="button" onClick={share} disabled={pending}>
						共有する
					</button>
				)}
			</div>
			{result?.text === payload.text && <output className="project-share-result">{result.message}</output>}
		</section>
	)
}
