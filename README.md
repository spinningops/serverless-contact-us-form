## **Issues found**

1. Node version is deprecated and causes Cloudformation rollback. So the CloudFormation `stack.yml` must be updated accordingly

    ```
    ContactUsFunction:
        Type: AWS::Serverless::Function
        Properties:
        Handler: index.handler
        Timeout: 5
        CodeUri: ./index.js
        Runtime: nodejs8.10
    ```

2. Google reCAPTCHA only accepts `application/x-www-form-urlencoded` content type
    - [reCAPTCHA - error-codes: 'missing-input-response'](https://stackoverflow.com/questions/52416002/recaptcha-error-codes-missing-input-response-missing-input-secret-when-v)
  
3. Unable to publish via SNS due to authorization error. The `stack.yml` in this directory has been updated to include the original repository's policy and role.

    ```
    2019-06-20T09:16:21.619Z aa75b5cf-3b56-4c97-be2d-b7f4c2b29aa6 { AuthorizationError: User: arn:aws:sts::107316217049:assumed-role/contact-us-3-ContactUsFunctionRole-3G3XO839FTIA/contact-us-3-ContactUsFunction-1WLRRTDVT7FLG is not authorized to perform: SNS:Publish on resource: arn:aws:sns:us-east-1:107316217049:contact-us-3-topic
    ```

4. **Other**: Some small updates to `index.js` for readability using standard [Javascript style](https://standardjs.com/).



## **Prerequisites**

Inside of the `test` directory there are two files. `index.html` and `server.js` that are used as references below. This guide assumes the user has experience with AWS, HTML, Javascript, and Node

### AWS CLI

- Ensure your CLI is configured and can push to S3
- Create a test S3 bucket, i.e. "mytest" and run `aws s3 cp index.js s3://mytest`

### Google reCAPTCHA
- Sign up for a [reCAPTCHA v2 key](https://www.google.com/recaptcha/)
- **Add the URL** of where the file is hosted under **Settings > Domains**. Add `localhost` to use this directory's test server
  
___


### Deployment


1. Update the region for logs for resource `IamPolicyLambdaExecution`:
   - `Resource: arn:aws:logs:us-east-1:*:*`
     - _this exists on two lines_

2. Enusre an S3 bucket is set up for your deployment. For this example, I'll use `contact-form-bucket`
  
3. Upload artifacts to S3:

    ```
    aws cloudformation package --template-file stack.yml --output-template-file stack-output.yml --s3-bucket contact-form-bucket
    ```

4. Deploy Cloudformation Stack
   - Update the command below with your desired values:
     - `YOUR_STACK_NAME`
     - `Subject`
     - `ReCaptchaSecret`
     - `ToEmailAddress`
   - **Be sure to confirm your subscription that SNS emails you after deployment**

    ```
    aws cloudformation deploy --template-file stack-output.yml --stack-name YOUR_STACK_NAME --capabilities CAPABILITY_IAM --parameter-overrides "Subject=Thanks for contacting us" "ReCaptchaSecret=YOUR_CAPTCHA_SERVER_SECRET" "ToEmailAddress=WHO_SHOULD_RECEIVE_THESE_EMAILS@gmail.com"
    ```

5. Update `YOUR_API_GATEWAY_URL` in `./test/index.html` with your [API Gateway Url](https://console.aws.amazon.com/apigateway/home) that CloudFormation created
   
6. Update `YOUR_GOOGLE_RECAPTCHA_CLIENT_KEY` in `./test/index.html` with your Google **client** key

7. Load the test server to try your lambda function. This is required because Google's reCAPTCHA needs to validate the server the captcha runs on.

   - From a terminal, run: `node ./test/server.js`
   - In your browser, navigate to `http://localhost:1337/index.html`

8. Fill the form out and submit.

9. Check the `Parameters.ToEmailAddress` email
    
10.  Go to CloudWatch logs to troubleshoot if you do not receive an email

___

## **Troubleshooting**

- If the S3 bucket does not exist, you will get an access denied error.

- If you're not receiving emails, go to [SNS](https://console.aws.amazon.com/sns/v3/home), confirm your subscription, and publish a test message. 

- If you see errors such as "*Invalid Site Key*," you have not configured reCAPTCHA on google correctly.


```
Waiter encountered a terminal failure state Status: FAILED. Reason: Requires capabilities : [CAPABILITY_NAMED_IAM]
```

I received this error a couple of times even after deleting the cloudformation stack when testing. Renaming the `--stack-name` to a different than the previous fixed this for me.