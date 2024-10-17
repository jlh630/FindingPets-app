<template>
	<view class="content">
		<view class="page">
			<view class="image-content">
				<image style="width: 400px; height: 200px; background-color: #eeeeee;" mode="scaleToFill" :src="src">
				</image>
			</view>
		</view>

		<view class="uni-form-item uni-column text-area">
			<input class="uni-input" confirm-type="go" v-model="deviceId" placeholder="输入deviceId" />
			<button :type="isConnected ? 'warn' : 'primary'" size="mini"
				@click="connectMqtt">{{ isConnected ? '断开连接' : '建立连接' }}</button>
		</view>

		<view class="coordinates" v-if="isConnected">
			<p class="label">纬度: <span class="value">{{ location.latitude }}</span></p>
			<p class="label">经度: <span class="value">{{ location.longitude }}</span></p>
		</view>

		<view class="text-area" v-if="isConnected">
			<button type="primary" :disabled="warn" size="mini" style="margin: 10px;"
				@click="startTracking">发送位置</button>
			<button type="default" :disabled="warn" size="mini" style="margin: 10px;"
				@click="stopTracking">停止发送</button>
		</view>

		<!-- 日志框 -->
		<view class="log-container" v-if="isConnected">
			<view class="log-header">logs</view>
			<view class="log-content">
				<view v-for="(log, index) in logs" :key="index">
					<span style="color: seagreen;">
						{{log.formattedTime}}
					</span>
					<span>
						{{":"+log.message}}
					</span>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue';
	import mqtt from 'mqtt/dist/mqtt.js';

	const location = ref({});
	const isConnected = ref(false);
	const src = ref('/static/none.jpg');
	const client = ref(null);
	const timer = ref(null);
	const deviceId = ref('');
	const connectBaseUrl = `jianglh.icu:8083/mqtt`;
	const clientId = `mqtt_phone`;
	const warn = ref(true);
	const logs = ref([]); // 日志数组
	const showWindows = ref(false);
	let myOptions = {
		clean: true,
		connectTimeout: 4000,
		reconnectPeriod: 1000,
		clientId: clientId,
		username: 'web',
		password: 'web',
	};

	function log(message) {
		const currentTime = new Date();
		const formattedTime =
			`${currentTime.getMonth() + 1}-${currentTime.getDate()} ${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}`;

		logs.value.push({
			formattedTime,
			message
		});
		console.log(formattedTime + ":" + message);
	}

	function connectMqtt() {
		if (deviceId.value == '' || isNaN(deviceId.value)) {
			log("无效deviceId");
			return;
		}

		if (isConnected.value) {
			log("正在断开连接...");
			client.value.end(true);
			isConnected.value = false;
			log('断开连接成功');
		} else {
			client.value = mqtt.connect(`wx://${connectBaseUrl}`, myOptions);
			const topic = 'status/' + deviceId.value;

			client.value.on('connect', () => {
				log('连接成功');
				isConnected.value = true;
				src.value = "/static/light.jpg";
				client.value.subscribe([topic], () => {
					log(`订阅了主题 ${topic}`);
				});
			});

			client.value.on('message', (topic, message) => {
				const msg = JSON.parse(message.toString());
				warn.value = msg.code == 0;
				log("收到数据：" + JSON.stringify(msg));
				if (warn.value) {
					log("设备未激活");
				} else {
					log("设备激活可以发送位置");
				}
			});

			client.value.on("close", () => {
				log("已断开连接");
				isConnected.value = false;

			});

			client.value.on('error', (err) => {
				log('连接错误：' + err);
			});
		}
	}

	function getLocation() {
		uni.getLocation({
			type: 'wgs84',
			geocode: true,
			success: (res) => {
				location.value = {
					status: 1,
					latitude: res.latitude,
					longitude: res.longitude,
					time: getCurrentTime() + "",
					satelliteNum: 1
				};
				log('位置信息: ' + JSON.stringify(res));
				log("准备发送位置到服务端")
				client.value.publish('location/' + deviceId.value, JSON.stringify(location.value), {
					qos: 0,
					retain: false
				}, function(error) {
					if (error) {
						log(error)
					} else {
						log('成功把位置信息发送给服务端')
					}
				})

			},
			fail(err) {
				log( JSON.stringify(err))
				if(showWindows.value){
					return;
				}
				showWindows.value=true;
				uni.showModal({
					title: "提示",
					content: "获取定位失败,是否授权打开",
					success(res) {
						if (res.confirm) {
							const main = plus.android.runtimeMainActivity();
							const Intent = plus.android.importClass('android.content.Intent');
							const Settings = plus.android.importClass('android.provider.Settings');
							const intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
							main.startActivity(intent);
						}
						showWindows.value=false;
					},
				});
				
			},
		});
	}

	function getCurrentTime() {
		const now = new Date();
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`;
	}

	function startTracking() {
		if (!timer.value) {
			console.log("开始发送位置");
			getLocation();
			timer.value = setInterval(getLocation, 5000);
		}
	}

	function stopTracking() {
		if (timer.value) {
			log("暂停发送位置");
			clearInterval(timer.value);
			timer.value = null;
		}
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20rpx;
	}

	.coordinates {
		margin: 20rpx 0;
		padding: 10rpx;
		border: 1px solid #ccc;
		border-radius: 8px;
		background-color: #f9f9f9;
		width: 80%;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.label {
		font-size: 30rpx;
		color: #333;
		margin: 5rpx 0;
	}

	.value {
		font-weight: bold;
		color: #007aff;
	}

	.text-area {
		display: flex;
		justify-content: center;
		margin: 10rpx 0;
	}

	.log-container {
		margin: 20px;
		width: 90%;
		max-height: 358px;
		border: 1px solid #ccc;
		border-radius: 8px;
		overflow-y: auto;
		background-color: #f9f9f9;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.log-header {
		padding: 10px;
		font-size: 15px;
		font-weight: bold;
		background-color: #f0f0f0;
		text-align: center;
		border-bottom: 1px solid #ccc;
	}

	.log-content {
		font-size: 15px;
		padding: 10px;
	}
</style>