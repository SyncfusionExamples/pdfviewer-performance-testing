import { bootstrapApplication } from '@angular/platform-browser';
import { registerLicense } from '@syncfusion/ej2-base';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { SYNCFUSION_LICENSE_KEY } from './license';

if (SYNCFUSION_LICENSE_KEY) registerLicense(SYNCFUSION_LICENSE_KEY);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
