import { createRoot } from 'react-dom/client'
import { AppRouter } from './app/routes'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(<AppRouter />)
