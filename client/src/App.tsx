import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { router } from './app/router'
import { queryClient } from './app/services'
import { useAuth } from './auth'

export default function App() {
	const auth = useAuth()
	const previousDid = useRef(auth.session?.sub)
	useEffect(() => {
		const did = auth.session?.sub
		if (previousDid.current && previousDid.current !== did) {
			const privateQuery = {
				predicate: (query: { queryKey: readonly unknown[] }) => String(query.queryKey[0]).startsWith('raw-'),
			}
			void queryClient.cancelQueries(privateQuery).then(() => queryClient.removeQueries(privateQuery))
		}
		previousDid.current = did
	}, [auth.session?.sub])
	return <RouterProvider router={router} context={{ auth }} />
}
