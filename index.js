const streamToPromise = require('stream-to-promise')
const rp = require('request-promise')

const url = 'https://graph-video.facebook.com'
const version = 'v3.2'

const retryMax = 10
let retry = 0

function apiInit(args, videoSize) {
  const options = {
    method: 'POST',
    uri: `${url}/${version}/${args.id}/videos?access_token=${args.token}`,
    json: true,
    form: {
      upload_phase: 'start',
      file_size: videoSize
    }
  }

  return rp(options).then(res => res)
}

function apiFinish(args, upload_session_id, video_id) {
  const {token, id, stream, ...extraParams} = args

  const options = {
    method: 'POST',
    json: true,
    uri: `${url}/${version}/${args.id}/videos`,
    formData: {
      ...extraParams,
      upload_session_id,
      access_token: args.token,
      upload_phase: 'finish',
    }
  }

  return rp(options)
    .then(res => ({...res, video_id}))
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
  }
  const options = {
    method: 'POST',
    uri: `${url}/${version}/${args.id}/videos`,
    formData: formData,
    json: true
  }

  return rp(options)
    .then(res => {
      retry = 0
      return res
    })
    .catch(err => {
      if (retry++ >= retryMax) {
        return err
      }
      return uploadChunk(args, id, start, chunk)
    })
}

function uploadChain(buffer, args, res, ids) {
  if (res.start_offset === res.end_offset) {
    return ids
  }

  var chunk = buffer.slice(res.start_offset, res.end_offset)
  return uploadChunk(args, ids[0], res.start_offset, chunk)
    .then(res => uploadChain(buffer, args, res, ids))
}

function facebookApiVideoUpload(args) {
  return streamToPromise(args.stream)
    .then(buffer => Promise.all([buffer, apiInit(args, buffer.length)]))
    .then(([buffer, res]) => uploadChain(buffer, args, res, [res.upload_session_id, res.video_id]))
    .then(([id, video_id]) => apiFinish(args, id, video_id))
}

module.exports = facebookApiVideoUpload
