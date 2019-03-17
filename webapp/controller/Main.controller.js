sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function (Controller) {
	"use strict";

	return Controller.extend("com.flexso.digital.ai.EmotionDetection.controller.Main", {
		onInit: function () {
			// check using phone or not
			if (/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)) {
				alert('Sorry, this website not support mobile divices currently.');
				history.back();
			} // check using chrome
			if (!window.chrome) {
				if (confirm('This website needs Chrome browser!!!')) {
					closewin();
				} else {
					history.back();
				}
			}
			var constraints = {
				video: true
			};
			var $body = document.querySelector('body'); //    var status = document.getElementById('status');
			this.emotion_labels = [
				"angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"
			];
			this.emotion_colors = [
				"#ff0000", "#00a800", "#ff4fc1", "#ffe100", "#306eff", "#ff9d00", "#7c7c7c"
			];
			var offset_x = 15;
			var offset_y = 40;

			var createModel = function (path) {
				return tf.loadModel(path).then(function (result) {
					return result;
				});
			}; // load models
			var loadModel = function (path) {
				var status = this.byId("status");//document.getElementById('status'); //        status.innerText = "Model Loading ..."
				createModel(path).then(function (result) {
					this.predictionmodel = result;
					status.innerText = "Model Loaded !!!"
				}.bind(this));
			}.bind(this);
			loadModel('model/mobilenetv1_models/model.json'); // create model
		},

		createVideoElement: function () {
			var $video = document.createElement('video')
			$video.style.maxWidth = '100vw'
			$video.style.width = '100vw'
			$video.style.maxHeight = '0vh'
			$body.appendChild($video)
			return $video
		},

		handleError: function (error) {
			if (error.name === 'DevicesNotFoundError') {
				alert('No camera detected. <br> Do you have any camera connected?');
			} else if (error.name === 'NotAllowedError') {
				alert('You have to allow camera access in order to run this experiment.');
			} else if (navigator.userAgent.indexOf('Chrome') > -1) {
				alert('Error. <br> Enable experimental features on chrome://flags/#enable-experimental-web-platform-features');
			} else {
				alert('Error. <br> Does your browser supports FaceDetector API?');
			}
			console.error(error)
		},

		createCanvas: function (video) {
			var canvas = document.getElementById('canvas')
			var videoCompStyle = window.getComputedStyle(video)
			canvas.width = videoCompStyle.width.replace('px', '')
			canvas.height = videoCompStyle.height.replace('px', '') //        canvas.style.display = 'none'
			document.querySelector('body').appendChild(canvas)
			return canvas
		},

		createDrawFunction: function () {
			var faceDetector = new window.FaceDetector({
				maxDetectedFaces: 3
			})
			var isDetectingFaces = false
			var faces = []
			var hideTimeout;
			var offset_x = 15;
			var offset_y=40;
			var me = this;
			return function draw(canvas, video) {
				window.requestAnimationFrame(function () {
					return draw(canvas, video)
				});
				var context = canvas.getContext('2d')
				var videoCompStyle = window.getComputedStyle(video)
				var videoWidth = videoCompStyle.width.replace('px', '')
				var videoHeight = videoCompStyle.height.replace('px', '')
				context.drawImage(video, 0, 0, videoWidth, videoHeight) //            context.clearRect(0, 0, canvas.width, canvas.height);//            clearTimeout(hideTimeout)
				if (faces.length) { //                let canvas = document.getElementById('canvas')
					var ctx = context; //                let scale = 1;
					ctx.lineWidth = 4;
					ctx.font = "20px Arial"
					ctx.fillText('Result', 0, 0);
					for (var i = 0; i < faces.length; i++) {
						ctx.beginPath();
						var item = faces[i].boundingBox; //                    console.log(item)
						var s_x = Math.floor(item.x - offset_x / 2);
						var s_y = Math.floor(item.y - offset_y / 2);
						var s_w = Math.floor(item.width + offset_x);
						var s_h = Math.floor(item.height + offset_y);
						var cT = ctx.getImageData(s_x, s_y, s_w, s_h);
						cT = me.preprocess(cT);
						var z = me.predictionmodel.predict(cT)
						var index = z.argMax(1).dataSync()[0]
						var label = me.emotion_labels[index];
						ctx.strokeStyle = me.emotion_colors[index];
						ctx.rect(s_x, s_y, s_w, s_h);
						ctx.stroke();
						ctx.fillStyle = me.emotion_colors[index];
						ctx.fillText(label, s_x, s_y);
						ctx.closePath();
					}
				} else {
					console.log('NO FACE') //                status.innerHTML = "NO FACE";
				}
				if (isDetectingFaces) {
					return
				}
				isDetectingFaces = true;
				// faces = await faceDetector.detect(canvas)
				return faceDetector.detect(canvas).then(function (result) {
					faces = result;
					isDetectingFaces = false
					var status = me.byId("status");//document.getElementById('status');
					status.innerHTML = "Running the model ... ";
				}.bind(this));

			}.bind(this)
		},

		preprocess: function (imgData) {
			return tf.tidy(function () {
				var tensor = tf.fromPixels(imgData).toFloat();
				tensor = tensor.resizeBilinear([
					100, 100
				])
				tensor = tf.cast(tensor, 'float32')
				var offset = tf.scalar(255.0); // Normalize the image 
				var normalized = tensor.div(offset); //We add a dimension to get a batch shape 
				var batched = normalized.expandDims(0)
				return batched
			})
		},

		playCameraOnVideo: function (video) {
			return navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: 'user',
						frameRate: 60
					},
					audio: false
				})
				.then(function (srcObject) {
					video.srcObject = srcObject
				})
				.then(function () {
					video.play()
				});
		},
		// async function main(video) {
		main: function (video) {
			var video_canvas = this.createCanvas(video)
			var draw = this.createDrawFunction()
			draw(video_canvas, video)
		},

		onStartVideo: function () {
			var me = this;
			var x = document.getElementById("thank");
			x.style.display = "none";
			// var elem = document.getElementById('start');
			// elem.parentNode.removeChild(elem);
			var status = this.byId("status");//document.getElementById('status');
			status.innerHTML = "Initializing the camera ... ";
			// var ori = document.getElementById("original_video"); //        var emo = document.getElementById("emotion_video");
			// ori.innerHTML = "Original: " //        emo.innerHTML = "Result : "
			this.playCameraOnVideo(video).then(function () {
				me.main(video)
			}).catch(me.handleError)
		}
	});
});