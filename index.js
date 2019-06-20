const https = require('https')
const querystring = require('querystring')
const AWS = require('aws-sdk')

function createEmailBody (data) {
  let message = ''
  Object.keys(data).forEach(function (key) {
    message += key + ':\n'
    message += '\t' + data[key] + '\n\n'
  })
  return message
}

function createResponse (statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
    },
    body
  }
}

exports.handler = function (event, context, callback) {
  console.log(process.env.ReCaptchaSecret)
  const inputData = JSON.parse(event.body)
  const postData = querystring.stringify({
    'secret': process.env.ReCaptchaSecret,
    'response': inputData['g-recaptcha-response']
  })

  const options = {
    hostname: 'www.google.com',
    port: 443,
    path: '/recaptcha/api/siteverify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `secret=${process.env.ReCaptchaSecret}&response=${inputData['g-recaptcha-response']}`
  }

  const req = https.request(options, function (res) {
    res.setEncoding('utf8')
    res.on('data', function (chunk) {
      const captchaResponse = JSON.parse(chunk)

      if (captchaResponse.success) {
        delete inputData['g-recaptcha-response']

        const params = {
          Message: createEmailBody(inputData),
          Subject: process.env.Subject,
          TopicArn: process.env.ContactUsSNSTopic
        }

        // Create promise and SNS service object
        const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise()

        // Handle promise's fulfilled/rejected states
        publishTextPromise.then(
          function (data) {
            console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`)
            console.log('MessageID is ' + data.MessageId)

            const successRes = JSON.stringify({ data, params })
            callback(null, createResponse('200', successRes))
          }).catch(
          function (err) {
            console.error(err, err.stack)

            const errorRes = JSON.stringify({ message: err.message })
            callback(null, createResponse('500', errorRes))
          })
      } else {
        const errorRes = JSON.stringify({ message: 'Invalid recaptcha' })
        callback(null, createResponse('500', errorRes))
      }
    })
  })

  req.on('error', function (e) {
    const errorRes = JSON.stringify({ message: e.message })
    callback(null, createResponse('500', errorRes))
  })

  // write data to request body
  req.write(postData)
  req.end()
}
