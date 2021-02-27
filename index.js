const streamToPromise = require('stream-to-promise')
const rp = require('request-promise')

const url = 'https://graph-video.facebook.com'
const version = 'v9.0'

const retryMax = 10
let retry = 0

const apiInit = async (args, videoSize) => {
  const options = {
    method: 'POST',
    uri: `${url}/${version}/${args.id}/videos?access_token=${args.token}`,
    json: true,
    form: {
      upload_phase: 'start',
      file_size: videoSize
    }
  }

  return await rp(options)
}

const apiFinish = async (args, upload_session_id, video_id) => {
  const { token, id, stream, ...extraParams } = args

  const options = {
    method: 'POST',
    json: true,
    uri: `${url}/${version}/${args.id}/videos`,
    formData: {
      ...extraParams,
      upload_session_id,
      access_token: args.token,
      upload_phase: 'finish'
    }
  }
  const res = await rp(options)
  return { ...res, video_id }
}

const uploadChunk = async (args, id, start, chunk) => {
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

  try {
    const res = await rp(options)
    retry = 0
    return res
  } catch (err) {
    return retry++ >= retryMax ? err : uploadChunk(args, id, start, chunk)
  }
}

const uploadChain = async (buffer, args, res, ids) => {
  if (res.start_offset === res.end_offset) {
    return ids
  }

  var chunk = buffer.slice(res.start_offset, res.end_offset)
  const response = await uploadChunk(args, ids[0], res.start_offset, chunk)
  return uploadChain(buffer, args, response, ids)
}

const facebookApiVideoUpload = async (args) => {
  const buffer = await streamToPromise(args.stream)
  const res = await Promise.all([buffer, apiInit(args, buffer.length)])
  const res2 = await uploadChain(res[0], args, res[1], [
    res[1].upload_session_id,
    res[1].video_id
  ])
  return apiFinish(args, res2[0], res2[1])
}

module.exports = facebookApiVideoUpload
