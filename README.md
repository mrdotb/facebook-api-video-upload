[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

#facebook-api-video-upload

This module handle the video upload chunk for facebook api.
[fb video upload](https://developers.facebook.com/docs/graph-api/video-uploads)

##How to use ?
```javascript
const fbUpload = require('facebook-api-video-upload');

const args = {
	token: yourtoken, // with the permission to upload
	id: yourid, //The id represent {page_id || user_id || event_id || group_id}
	videoPath: videoPath //path to the video
};

fbUpload(args).then((res) => {
	console.log(res);
}).catch((e) => {
	console.error(e);
});
```
