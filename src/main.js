import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'

Vue.config.productionTip = false

import VTooltip from 'v-tooltip'

Vue.use(VTooltip)

import * as Sentry from '@sentry/browser'
import * as Integrations from '@sentry/integrations'

if (process.env.NODE_ENV !== 'development') {
    Sentry.init({
        dsn: 'https://70738cb4636b44d0b589aebcecf9f839@sentry.io/1507320',
        integrations: [new Integrations.Vue({ Vue, attachProps: true })],
    })
}

new Vue({
    render: h => h(App),
}).$mount('#app')
