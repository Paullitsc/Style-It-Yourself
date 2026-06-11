import { createRoot } from 'react-dom/client'
import { Popup } from './Popup'
import './popup.css'

// No StrictMode: the popup is short-lived and StrictMode's double-invoke would
// fire two analyze-product requests on every open.
const container = document.getElementById('root')
if (container) {
  createRoot(container).render(<Popup />)
}
