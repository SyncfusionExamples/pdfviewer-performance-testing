import { createRoot } from 'react-dom/client';
import { registerLicense } from '@syncfusion/ej2-base';
import './index.css';
import './app.css';
import App from './App';

registerLicense('SYNCFUSION_LICENSE_KEY');

// StrictMode is intentionally not used: in development it mounts components twice,
// which would create the PDF Viewer twice and distort the load timing.
createRoot(document.getElementById('root')!).render(<App />);
