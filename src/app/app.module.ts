import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExtraOptions, PreloadAllModules, RouterModule } from '@angular/router';
import { FuseModule } from '@kitkat';
import { FuseConfigModule } from '@kitkat/services/config';
import { FuseMockApiModule } from '@kitkat/lib/mock-api';
import { CoreModule } from 'app/core/core.module';
import { appConfig } from 'app/core/config/app.config';
import { mockApiServices } from 'app/mock-api';
import { LayoutModule } from 'app/layout/layout.module';
import { AppComponent } from 'app/app.component';
import { appRoutes } from 'app/app.routing';
import { HighchartsChartModule } from 'highcharts-angular';
import { GoogleMapsModule } from '@angular/google-maps';

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './modules/auth/auth.intercept';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { APP_BASE_HREF } from '@angular/common';
import { provideNgxMask } from 'ngx-mask';

const routerConfig: ExtraOptions = {
    preloadingStrategy       : PreloadAllModules,
    scrollPositionRestoration: 'enabled',
    useHash:true
};

@NgModule({
    declarations: [
        AppComponent,
    ],
    providers: [{
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true,
            },
            provideEnvironmentNgxMask(),
            provideNgxMask()
    ],
    imports     : [
        BrowserModule,
        BrowserAnimationsModule,
        RouterModule.forRoot(appRoutes, routerConfig),
        GoogleMapsModule,
        // kitkat, FuseConfig & FuseMockAPI
        FuseModule,
        FuseConfigModule.forRoot(appConfig),
        FuseMockApiModule.forRoot(mockApiServices),


        // Core module of your application
        CoreModule,

        // Layout module of your application
        LayoutModule,
        HighchartsChartModule,
    ],
    bootstrap   : [
        AppComponent
    ]
})
export class AppModule
{
}
