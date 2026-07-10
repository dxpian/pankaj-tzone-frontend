import { Route } from '@angular/router';
import { AuthGuard } from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent } from 'app/layout/layout.component';
import { InitialDataResolver } from 'app/app.resolvers';

// @formatter:off
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const appRoutes: Route[] = [

    // Redirect empty path to '/device'
    {path: '', pathMatch : 'full', redirectTo: 'device'},

    // Auth routes for guests
    {
        path: '',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'sign-in', loadChildren: () => import('app/modules/auth/sign-in/sign-in.module').then(m => m.AuthSignInModule)},
            // {path: 'sign-up', loadChildren: () => import('app/modules/auth/sign-up/sign-up.module').then(m => m.SignUpModule)},
            {path: 'forgot-password', loadChildren: () => import('app/modules/auth/password/password.module').then(m => m.PasswordModule)}

        ]
    },

    // landing page routes after login
    {
        path       : '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component  : LayoutComponent,
        resolve    : {
            initialData: InitialDataResolver,
        },
        children   : [
             {path: 'device', loadChildren: () => import('app/modules/landing/device-management/device-management.module').then(m => m.DeviceManagementModule)},
             {path: 'real-time-monitoring', loadChildren: () => import('app/modules/landing/real-time-monitoring/real-time-monitoring.module').then(m => m.RealTimeMonitoringModule)},
             {path: 'alarm', loadChildren: () => import('app/modules/landing/alarm-settings/alarm-settings.module').then(m => m.AlarmSettingsModule)},
             {path: 'reports', loadChildren: () => import('app/modules/landing/reporting/reporting.module').then(m => m.ReportingModule)},
             {path: 'message', loadChildren: () => import('app/modules/landing/message-center/message-center.module').then(m => m.MessageCenterModule)},
             {path: 'service', loadChildren: () => import('app/modules/landing/service/service.module').then(m => m.ServiceModule)},
             {path: 'account', loadChildren: () => import('app/modules/landing/account/account.module').then(m => m.AccountModule)},
             {path: 'mobile', loadChildren: () => import('app/modules/landing/mobile/mobile.module').then(m => m.MobileModule)},
             {path: 'license', loadChildren: () => import('app/modules/landing/license/license.module').then(m => m.LicenseModule)},
             {path: 'personalized', loadChildren: () => import('app/modules/landing/personalized/personalized.module').then(m => m.PersonalizedModule)},
             {path: 'system', loadChildren: () => import('app/modules/landing/system/system.module').then(m => m.SystemModule)},
             {path: 'overview', loadChildren: () => import('app/modules/landing/overview/overview.module').then(m => m.OverviewModule)},

        ]
    },
    {path: '**', pathMatch : 'full', redirectTo: 'device'},
];
