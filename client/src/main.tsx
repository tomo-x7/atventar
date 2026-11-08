import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { queryClient } from './app/services'
import { AuthProvider } from './auth'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<App />
			</AuthProvider>
		</QueryClientProvider>
	</StrictMode>,
)
