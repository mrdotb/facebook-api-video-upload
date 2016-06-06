[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

# facebook-api-video-upload
> Upload a video in chunk on the facebook api. [more info](https://developers.facebook.com/docs/graph-api/video-uploads)

## Install
```
$ npm i facebook-api-video-upload --save
```
Tested on OS X and Linux.

## Usage
```javascript
const fbUpload = require('facebook-api-video-upload');

const args = {
	token: yourtoken, // with the permission to upload
	id: yourid, //The id represent {page_id || user_id || event_id || group_id}
	videoPath: videoPath //path to the video
};

fbUpload(args).then((data) => {
	console.log(data);
	//	{ videoName: 'fixture.mp4',
	//	  type: { ext: 'mp4', mime: 'video/mp4' },
	//	  video_id: '1752436138346810',
	//	  upload_session_id: '1752436151680142',
	//	  res: { success: true } }
}).catch((e) => {
	console.error(e);
});

## License
MIT © [MrdotB](https://github.com/MRdotB)
