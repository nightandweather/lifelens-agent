#!/usr/bin/env bash
set -euo pipefail

repo="nightandweather/lifelens-agent"
site="https://lifelens-agent.kanghoun.chatgpt.site"
region="ap-northeast-2"
function_name="LifeLensAgent"

test -r Goal.md

head_sha=$(git rev-parse HEAD)
remote_sha=$(git ls-remote origin refs/heads/main | awk '{print $1}')
test "$head_sha" = "$remote_sha"

ci=$(gh run list --repo "$repo" --branch main --workflow CI --limit 1 \
  --json headSha,status,conclusion \
  --jq '.[0] | [.headSha,.status,.conclusion] | @tsv')
ci_sha=$(printf '%s' "$ci" | awk '{print $1}')
ci_status=$(printf '%s' "$ci" | awk '{print $2}')
ci_conclusion=$(printf '%s' "$ci" | awk '{print $3}')
test "$ci_sha" = "$head_sha"
test "$ci_status" = "in_progress" -o "$ci_conclusion" = "success"

site_code=$(curl -sS --max-time 20 -o /tmp/lifelens_health.html \
  -w '%{http_code}' "$site/")
test "$site_code" = "200"
rg -q '<title>LifeLens' /tmp/lifelens_health.html

api_code=$(curl -sS --max-time 45 -o /tmp/lifelens_api.json \
  -w '%{http_code}' -H 'content-type: application/json' \
  -d '{"scene":"meal","sessionActive":true}' "$site/api/analyze")
test "$api_code" = "200"
jq -e '(.mode=="strands-bedrock") and (.analysis|type=="object") and (.analysis.proposed_action.requires_confirmation==true)' \
  /tmp/lifelens_api.json >/dev/null

lambda_state=$(aws lambda get-function-configuration \
  --function-name "$function_name" --region "$region" \
  --query '[State,LastUpdateStatus]' --output text)
test "$lambda_state" = $'Active\tSuccessful'

start_time=$(date -u -v-30M '+%Y-%m-%dT%H:%M:%SZ')
end_time=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
errors=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda --metric-name Errors \
  --dimensions "Name=FunctionName,Value=$function_name" \
  --start-time "$start_time" --end-time "$end_time" \
  --period 1800 --statistics Sum --region "$region" \
  --query 'sum(Datapoints[].Sum)' --output text)

printf 'head=%s ci=%s/%s site=%s api=%s lambda=Active/Successful errors=%s\n' \
  "$head_sha" "$ci_status" "$ci_conclusion" "$site_code" "$api_code" "$errors"
