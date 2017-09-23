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
const fs = require('fs');
const fbUpload = require('facebook-api-video-upload');

const args = {
	token: yourtoken, // with the permission to upload
	id: yourid, //The id represent {page_id || user_id || event_id || group_id}
	stream: fs.createReadStream('./test/fixture/fixture.mp4') //path to the video,
	title: "my video",
	description: "my description"
};

fbUpload(args).then((res) => {
	console.log('res: ', res);
	//res:  { success: true, video_id: '1838312909759132' }
}).catch((e) => {
	console.error(e);
});
```

## License
MIT © [MrdotB](https://github.com/MRdotB)
