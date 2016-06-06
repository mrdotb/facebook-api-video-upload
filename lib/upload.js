'use strict';
// Dependencies
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const Promise = require('bluebird');
const fileType = require('file-type');
const readChunk = require('read-chunk');
const rp = require('request-promise');

// Define
const url = 'https://graph-video.facebook.com';
const supportedFormats = require('./supportedFormats').formats;
const {missing, type, missingId, missingToken, invalidMime} = require('./errors');

// Promisify
Promise.promisifyAll(fs);
const execAsync = Promise.promisify(exec);

function argsChecker(args) {
	if (!args) {
		throw new Error(missing);
	} else if ((typeof args) !== 'object') {
		throw new Error(`${type} ${typeof args}`);
	} else if (!args.id) {
		throw new Error(missingId);
	} else if (!args.token) {
		throw new Error(missingToken);
	}
	return fs.accessAsync(args.videoPath, fs.F_OK | fs.R_OK);
}

function getMime(path) {
	return readChunk(path, 0, 256)
	.then((buffer) => {
		const type = fileType(buffer);
		return (supportedFormats.some(el => (el === type.ext))) ?
		type :
		new Error(invalidMime);
	});
}

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

function splitFile(videoPath, res) {
	const destDir = path.basename(videoPath).split('.')[0] + parseInt(new Date() / 1000, 10);
	const absolutePath = path.join(process.cwd(), destDir);
	const ext = path.basename(videoPath).split('.')[1];
	const cmd = `split --bytes=${res.end_offset} ${videoPath} --additional-suffix=.${ext} ${destDir}/`;

	return Promise.resolve(getMime(videoPath))
		.tap((type) => fs.mkdirAsync(destDir))
		.tap((type) => execAsync(cmd))
		.then((type) => [type, fs.readdirAsync(destDir)])
		.spread((type, chunks) => {
			const data = {
				videoName: path.basename(videoPath),
				destDir: destDir,
				absolutePath: absolutePath,
				chunks: chunks,
				type: type,
				curr: 0,
				video_id: res.video_id,
				upload_session_id: res.upload_session_id,
				res: res
			};
			return (data);
		});
}

function uploadChunk(args, data) {
	const filePath = path.join(data.absolutePath, data.chunks[data.curr]);
	const formData = {
		access_token: args.token,
		upload_phase: 'transfer',
		start_offset: data.res.start_offset,
		upload_session_id: data.upload_session_id,
		video_file_chunk: {
			value: fs.createReadStream(filePath),
			options: {
				filename: data.chunks[data.curr],
				contentType: data.type.mime
			}
		}
	};
	const options = {
		method: 'POST',
		uri: `${url}/v2.6/${args.id}/videos`,
		formData: formData,
		json: true
	};

	return rp(options).then((res) => {
		data.res = res;
		data.curr++;
		return data;
	});
}

function uploadChain(args, data) {
	if (data.curr + 1 > data.chunks.length) {
		return data;
	}
	return uploadChunk(args, data).then((data) => {
		return uploadChain(args, data);
	});
}

function apiFinish(args, data) {
	const options = {
		method: 'POST',
		uri: `${url}/v2.6/${args.id}/videos`,
		form: {
			access_token: args.token,
			upload_phase: 'finish',
			upload_session_id: data.upload_session_id
		},
		json: true
	};

	return rp(options).then((res) => {
		data.res = res;
		return (data);
	});
}

function cleanChunks(data) {
	return Promise.map(data.chunks, (chunk) => {
		return fs.unlinkAsync(path.join(data.absolutePath, chunk));
	})
	.then(fs.rmdirAsync(data.absolutePath));
}

module.exports = (args) => {
	return argsChecker(args)
		.then(() => fs.statAsync(args.videoPath))
		.then((stat) => apiInit(args, stat.size))
		.then((res) => splitFile(args.videoPath, res))
		.then((data) => uploadChain(args, data))
		.then((data) => apiFinish(args, data))
		.tap((data) => cleanChunks(data));
};
