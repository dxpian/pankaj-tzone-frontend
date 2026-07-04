/* tslint:disable:max-line-length */
import { FuseNavigationItem } from '@kitkat/components/navigation';

export const defaultNavigation: FuseNavigationItem[] = [
    {
        id: 'Overview',
        title: 'Overview',
        type: 'basic',
        icon: 'heroicons_outline:home',
        link: '/overview'
    },
    {
        id: 'Device Management',
        title: 'Device Management',
        type: 'collapsable',
        icon: 'heroicons_outline:chart-pie',
        link: '/device',
        children: [
            {
                id: 'Device List',
                title: 'Loggers',
                type: 'basic',
                icon: 'heroicons_outline:server',
                link: '/device',
                exactMatch: true,
            },
            {
                id: 'SIM Management',
                title: 'SIM Management',
                type: 'basic',
                icon: 'heroicons_outline:credit-card',
                link: '/device/sim',
                exactMatch: true,
            },
            {
                id: 'Device Register',
                title: 'Register',
                type: 'basic',
                icon: 'heroicons_outline:document-add',
                link: '/device/register',
                exactMatch: true,
            },
        ]
    },
    {
        id: 'Real Time Monitoring',
        title: 'Real Time Monitoring',
        type: 'basic',
        icon: 'heroicons_outline:squares-2x2',
        link: '/real-time-monitoring'
    },
    {
        id: 'Reports',
        title: 'Reports',
        type: 'basic',
        icon: 'heroicons_outline:chart-bar',
        link: '/reports'
    },
    {
        id: 'Alarm',
        title: 'Alarm Settings',
        type: 'basic',
        icon: 'heroicons_outline:bell',
        link: '/alarm'
    },
    {
        id: 'Mobile',
        title: 'Mobile',
        type: 'collapsable',
        icon: 'heroicons_outline:device-phone-mobile',
        children:[
            {
                id: 'MobileAdminUser', 
                title: 'Mobile Users',
                type: 'basic',
                icon: 'heroicons_outline:user-circle',
                link: '/mobile/mobile-admin-user-management'
            },
            {
                id: 'MobileUser', 
                title: 'Mobile Users',
                type: 'basic',
                icon: 'heroicons_outline:user-circle',
                link: '/mobile/mobile-user-management'
            },
            {
                id: 'AreaCluster', 
                title: 'Area & Cluster',
                type: 'basic',
                icon: 'heroicons_outline:rectangle-group',
                link: '/mobile/cluster-area'
            },
            {
                id: 'ManageCluster', 
                title: 'Manage Cluster',
                type: 'basic',
                icon: 'heroicons_outline:rectangle-group',
                link: '/mobile/manage-cluster'
            }, 
            {
                id: 'MobileAlarm', 
                title: 'Mobile Alarm',
                type: 'basic',
                icon: 'heroicons_outline:bell-alert',
                link: '/mobile/mobile-alarm'
            }
        ]
    },
    {
        id: 'License',
        title: 'License',
        type: 'collapsable',
        icon: 'heroicons_outline:key',
        children: [
            {
                id: 'LicenseModels',
                title: 'License Models',
                type: 'basic',
                icon: 'heroicons_outline:document-text',
                link: '/license/models'
            },
            {
                id: 'LicenseAllocation',
                title: 'License Allocation',
                type: 'basic',
                icon: 'heroicons_outline:user-circle',
                link: '/license/allocation'
            }
        ]
    },
    {
        id: 'Message Center',
        title: 'Message Center',
        type: 'collapsable',
        icon: 'heroicons_outline:chat-bubble-oval-left-ellipsis',
        children: [
            /*{
                id: 'Alarm Message',
                title: 'Alarm Message',
                type: 'basic',
                icon: 'heroicons_outline:bell',
                link: '/message/alarm'
            },
            */
            {
                id: 'Execption Information',
                title: 'Execption Information',
                type: 'basic',
                icon: 'mat_outline:bug_report',
                link: '/message/exception-info'
            },
            {
                id: 'Notification Message',
                title: 'Notification Message',
                type: 'basic',
                icon: 'mat_outline:mode_comment',
                link: '/message/notification'
            },
        ]
    },
    {
        id: 'divider-1',
        type: 'divider'
    },
    {
        id: 'account and settings',
        title: 'ACCOUNTS AND SETTINGS',
        type: 'group',
        children: [
            {
                id: 'Account ID',
                title: 'Account',
                type: 'collapsable',
                icon: 'heroicons_outline:user-circle',
                children: [
                    {
                        id: 'AdminUser',
                        title: 'Admin User',
                        type: 'basic',
                        icon: 'heroicons_outline:user-group',
                        link: '/account/admin-user-management'
                    },
                    
                    {
                        id: 'User Management',
                        title: 'Sub-User Management',
                        type: 'basic',
                        icon: 'heroicons_outline:user',
                        link: '/account/user'
                    },
                    {
                        id: 'My Account',
                        title: 'My Account',
                        type: 'basic',
                        icon: 'heroicons_outline:user-circle',
                        link: '/account/my-account'
                    },
                    {
                        id: 'Grouping and permissions',
                        title: 'Grouping and permissions',
                        type: 'basic',
                        icon: 'heroicons_outline:user-circle',
                        link: '/account/group'
                    },
                    {
                        id: 'Security and Privacy Settings',
                        title: 'Security and Privacy Settings',
                        type: 'basic',
                        icon: 'heroicons_outline:shield-check',
                        link: '/account/settings'
                    },
                    {
                        id: 'Log Information',
                        title: 'Log Information',
                        type: 'basic',
                        icon: 'heroicons_outline:flag',
                        link: '/account/log-info'
                    },
                    {
                        id: 'Operation Log',
                        title: 'Operation Log',
                        type: 'basic',
                        icon: 'heroicons_outline:user-circle',
                        link: '/account/operation-log'
                    }
                ],
            },
            {
                id: 'Service',
                title: 'Service',
                type: 'collapsable',
                icon: 'heroicons_outline:server-stack',
                children: [

                    {
                        id: 'Message Push Service',
                        title: 'Message Service',
                        type: 'collapsable',
                        icon: 'heroicons_outline:chat',
                        children: [
                            {
                                id: 'Alfresa-Center',
                                title: 'Alfresa Centers',
                                type: 'basic',
                                icon: 'heroicons_outline:office-building',
                                link: '/service/alfresa-center'
                            },
                            {
                                id: 'Alfresa-Alarm',
                                title: 'Alfresa Alarm',
                                type: 'basic',
                                icon: 'heroicons_outline:mail',
                                link: '/service/alfresa-alarms'
                            },
                            {
                                id: 'Email',
                                title: 'E-mail',
                                type: 'basic',
                                icon: 'heroicons_outline:mail',
                                link: '/service/email'
                            },
                            {
                                id: 'Holiday',
                                title: 'Holiday',
                                type: 'basic',
                                icon: 'heroicons_outline:sparkles',
                                link: '/service/holiday'
                            },
                            {
                                id: 'Sms',
                                title: 'SMS',
                                type: 'basic',
                                icon: 'heroicons_outline:chat',
                                link: '/service/sms'
                            },
                        ]
                    },
                    {
                        id: 'Api Authorization',
                        title: 'Api Authorization',
                        type: 'basic',
                        icon: 'heroicons_outline:server-stack',
                        link: '/service/api-authorization'
                    },
                    {
                        id: 'Location Service',
                        title: 'Location Service',
                        type: 'collapsable',
                        icon: 'mat_outline:gps_fixed',
                        children : [
                            {
                                id: 'Base Station Location Service',
                                title: 'Base Station Location Service',
                                type: 'basic',
                                icon: "mat_outline:location_on",
                                link: '/service/location'
                            }
                        ]
                    }

                ],

            },  
            {
                id: 'Personalized',
                title: 'Personalized',
                type: 'collapsable',
                icon: 'mat_outline:format_paint',
                children: [
                    {
                        id: 'Site',
                        title: 'Site',
                        type: 'basic',
                        icon: 'heroicons_outline:globe-alt',
                        link: '/personalized/site'
                    },
                    {
                        id: 'Domain',
                        title: 'Domain',
                        type: 'basic',
                        icon: 'heroicons_solid:globe',
                        link: '/personalized/domain'
                    },
                    {
                        id: 'contact',
                        title: 'Contact',
                        type: 'basic',
                        icon: 'heroicons_outline:phone',
                        link: '/personalized/contact'
                    }
                ],
            },
            {
                id: 'System',
                title: 'System',
                type: 'collapsable',
                icon: 'heroicons_outline:cog',
                children: [
                    {
                        id: 'Big screen monitoring settings',
                        title: 'Big screen monitoring settings',
                        type: 'basic',
                        icon: 'heroicons_outline:cog',
                        link: '/system/big-sceen-settings'
                    },
                    {
                        id: 'Big screen monitoring',
                        title: 'Big screen monitoring',
                        type: 'basic',
                        icon: 'heroicons_outline:desktop-computer',
                        link: '/system/bigscreen'
                    },
                    {
                        id: 'about',
                        title: 'About',
                        type: 'basic',
                        icon: 'heroicons_outline:information-circle',
                        link: '/system/about'
                    }
                ],
            }
        ]
    },


];

