'use strict';
// Dependencies
const Promise = require('bluebird');
const streamToPromise = require('stream-to-promise');
const rp = require('request-promise');

// Define
const url = 'https://graph-video.facebook.com';

function apiInit(args, videoSize) {
	const options = {
		method: 'POST',
		uri: `${url}/v2.6/${args.id}/videos?access_token=${args.token}`,
		json: true,
		form: {
			upload_phase: 'start',
			file_size: videoSize
		}
	};

	return rp(options);
}

function apiFinish(args, id) {
	const options = {
		method: 'POST',
		uri: `${url}/v2.6/${args.id}/videos`,
		form: {
			access_token: args.token,
			upload_phase: 'finish',
			upload_session_id: id
		},
		json: true
	};

	return rp(options).then(res => ({ ...res, id }));
}

function uploadChunk(args, id, start, chunk) {
	const formData = {
		access_token: args.token,
		upload_phase: 'transfer',
		start_offset: start,
		upload_session_id: id,
		video_file_chunk: {
			value: chunk,
			options: {
				filename: 'chunk'
			}
		}
	};
	const options = {
		method: 'POST',
		uri: `${url}/v2.6/${args.id}/videos`,
		formData: formData,
		json: true
	};

	return rp(options);
}

function uploadChain(buffer, args, id, res) {
	if (res.start_offset === res.end_offset) {
		return id;
	}
	var chunk = buffer.slice(res.start_offset, res.end_offset);
	return uploadChunk(args, id, res.start_offset, chunk)
	.then((res) => uploadChain(buffer, args, id, res));
}

function facebookApiVideoUpload(args) {
	return Promise.resolve(streamToPromise(args.stream))
		.then((buffer) => buffer)
		.then((buffer) => [buffer, apiInit(args, buffer.length)])
		.spread((buffer, res) => uploadChain(buffer, args, res.upload_session_id, res))
		.then((id) => apiFinish(args, id));
}

module.exports = facebookApiVideoUpload;

