const fs = require('fs');
const fbUpload = require('./');

// You can download some fixture using npm run fixture cmd

const args = {
  token: "", // with the permission to upload
  id: "", //The id represent {page_id || user_id || event_id || group_id}
  stream: fs.createReadStream('./fixture.mp4'), //path to the video,
  title: "my video",
  description: "my description",
  thumb: {
    value: fs.createReadStream('./fixture.jpg'),
    options: {
      filename: 'fixture.jpg',
      contentType: 'image/jpg'
    }
  }
  // if you want the default thumb from the video just remove the field
  // you can add any extra fields from the api https://developers.facebook.com/docs/graph-api/reference/page/videos/#Creating
  // all keys except token, id, stream are passed to the final request
};

fbUpload(args).then((res) => {
  console.log('res: ', res);
  //res:  { success: true, video_id: '1838312909759132' }
}).catch((e) => {
  console.error(e);
});
