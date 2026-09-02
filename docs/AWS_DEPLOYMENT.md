# AWS deployment

The public judge path runs the real Python Strands agent on AWS Lambda and calls
Amazon Bedrock in `ap-northeast-2`. It uses the global Amazon Nova 2 Lite inference
profile to keep latency and cost low. Lambda reserved concurrency is capped at
two, and the public function URL requires an application bearer token before it
will invoke the model.

## Deploy with AWS SAM

Prerequisites: AWS CLI, AWS SAM CLI, an AWS account with Bedrock model access,
and permission to create Lambda and IAM resources.

```bash
sam build
sam deploy --guided \
  --region ap-northeast-2 \
  --parameter-overrides AgentToken=REPLACE_WITH_A_LONG_RANDOM_VALUE
```

Copy the `AgentUrl` output into `LIFELENS_AGENT_API_URL` on the web deployment.
Set the same random value as the web deployment's secret
`LIFELENS_AGENT_TOKEN`. Never expose the token to browser JavaScript.

## Verify

`GET /health` is intentionally public and does not invoke the model. Analysis
requires the shared bearer token:

```bash
curl "$LIFELENS_AGENT_API_URL/health"
curl -X POST "$LIFELENS_AGENT_API_URL/v1/moments/analyze" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $LIFELENS_AGENT_TOKEN" \
  --data-binary @backend/fixtures/meal.json
```

The Lambda code accepts structured `MomentEvent` objects only. It never accepts
raw photos, audio, or video.
