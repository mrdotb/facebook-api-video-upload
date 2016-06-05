'use strict';
// Dependencies
const Promise = require('bluebird');
const fs = require('fs');
const rp = require('request-promise');
const path = require('path');

// Define
const url = "https://graph-video.facebook.com";
const { missing, type, missingId, missingToken } = require('./errors');

// Promisify
Promise.promisifyAll(fs);
const execAsync = Promise.promisify(require('child_process').exec);

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
};

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
};

function splitFile(videoPath, res) {
	const destDir = path.basename(videoPath).split('.')[0] + parseInt(new Date / 1000, 10);
	const ext = path.basename(videoPath).split('.')[1];
	const cmd = `split --bytes=${res.end_offset} ${videoPath} --additional-suffix=.${ext} ${destDir}/`;

	return fs.mkdirAsync(destDir).then(() => {
		return execAsync(cmd).then(() => {
			return fs.readdirAsync(destDir).then((chunks) => {
				const data = {
					destDir: destDir,
					absolutePath: path.join(process.cwd(), destDir),
					chunks: chunks,
					curr: 0,
					video_id: res.video_id,
					upload_session_id: res.upload_session_id,
					res: res
				};
				return (data);
			});
		});
	});
};


function uploadChunk(fbInfo, data) {
	const filePath = path.join(data.absolutePath, data.chunks[data.curr]);
	const formData = {
		access_token: fbInfo.token,
		upload_phase: 'transfer',
		start_offset: data.res.start_offset,
		upload_session_id: data.upload_session_id,
		video_file_chunk: {
			value: fs.createReadStream(filePath),
			options: {
				filename: data.chunks[data.curr],
				contentType: 'video/mp4'
			}
		}
	};
	const options = {
		method: 'POST',
		uri: `${url}/v2.6/${fbInfo.id}/videos`,
		formData: formData,
		json: true
	};

	return rp(options).then((res) => {
		data.res = res;
		data.curr++;
		return data;
	});
};

function uploadChain(args, data) {
	if (data.curr + 1 > data.chunks.length) {
		return data;
	};
	return uploadChunk(args, data)
		.then((data) => {
			return uploadChain(args, data);
	});
};

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
};

function cleanChunks(data) {
	const pathTo = path.join(process.cwd(), data.destDir);

	let promises = data.chunks.map((e) => {
		return fs.unlinkAsync(path.join(pathTo, e));
	});
	return Promise.all(promises).then(rmdirAsync(pathTo));
};

module.exports = (args) => {
	return argsChecker(args)
		.then(() => {
			return fs.statAsync(args.videoPath);
		})
		.then((stat) => {
			return apiInit(args, stat.size);
		})
		.then((res) => {
			return splitFile(args.videoPath, res);
		})
		.then((data) => {
			return uploadChain(args, data);
		})
		.then((data) => {
			return apiFinish(args, data);
		})
		.then((data) => {
			return cleanChunks(data);
		});
};
