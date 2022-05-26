# How it works ?

Datadog constructs install the following:

1. Datadog Integration role stack - Allows datadig to communicate
2. Datadog Cloudwatch to Kinesis stack - Role, Lambda, Subscription

Create secrets at following location:

`/account/datadog/api-key`  <-- Add Datadog API key here -->
`/account/datadog/app-key`  <-- Add Datadog APP key here -->

Once this is installed it also provides a customised Stack named `DatadogStack` which comes integrated with Datadog integrated functionality for lambda. Towards the end simple call

`datadogCDK.addLambdaFunctions([f])` Where f is function and voila

## Aspects

It also provides `ApplyDatadogRoleAspect` which provides lambda with fetching API key secret for convience.

## APM

- Forwarder Lambda - Installs a lmabda which gets triggerred and pushes logs to Datadog
- Lambda layers and extension - Gets binded on lambda as layer and executes along with lambda (Better)

## Log forwarding

- Forwarder Lambda - Installs a lmabda which gets triggerred and pushes logs to Datadog
- Kinesis Firehose streams - Create a Delivery stream and Direct put to datadog.
    Once this is setup, create cloudwatch subscriptions which route logs to this stream
    - Logging without limits - Apply filters and log patterns to ingest only required ones.
    - Generate metrics based on logs