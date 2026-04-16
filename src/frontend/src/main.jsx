import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import Context from './Context'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
     <Context>
    <BrowserRouter>
     
           <App />

    </BrowserRouter>
    </Context>
   
  </React.StrictMode>,
)
