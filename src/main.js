import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'

Vue.config.productionTip = false

import VTooltip from 'v-tooltip'

Vue.use(VTooltip)

new Vue({
    render: h => h(App),
}).$mount('#app')
