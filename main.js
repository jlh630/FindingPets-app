import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
uni.connectSocket = (function(connectSocket) {
	return function(options) {
		console.log(options)
		options.success = options.success || function() {}
		return connectSocket.call(this, options)
	}
})(uni.connectSocket)
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif