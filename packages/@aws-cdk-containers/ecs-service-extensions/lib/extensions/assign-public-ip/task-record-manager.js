"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRecordManager = void 0;
const path = require("path");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const events = require("@aws-cdk/aws-events");
const events_targets = require("@aws-cdk/aws-events-targets");
const iam = require("@aws-cdk/aws-iam");
const lambda = require("@aws-cdk/aws-lambda");
const lambda_es = require("@aws-cdk/aws-lambda-event-sources");
const sqs = require("@aws-cdk/aws-sqs");
const cdk = require("@aws-cdk/core");
const customresources = require("@aws-cdk/custom-resources");
const constructs_1 = require("constructs");
/**
 * An event-driven serverless app to maintain a list of public ips in a Route 53
 * hosted zone.
 */
class TaskRecordManager extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Poison pills go here.
        const deadLetterQueue = new sqs.Queue(this, 'EventsDL', {
            retentionPeriod: cdk.Duration.days(14),
        });
        // Time limit for processing queue items - we set the lambda time limit to
        // this value as well.
        const eventsQueueVisibilityTimeout = cdk.Duration.seconds(30);
        // This queue lets us batch together ecs task state events. This is useful
        // for when when we would be otherwise bombarded by them.
        const eventsQueue = new sqs.Queue(this, 'EventsQueue', {
            deadLetterQueue: {
                maxReceiveCount: 500,
                queue: deadLetterQueue,
            },
            visibilityTimeout: eventsQueueVisibilityTimeout,
        });
        // Storage for task and record set information.
        const recordsTable = new dynamodb.Table(this, 'Records', {
            partitionKey: {
                name: 'cluster_service',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Put the cluster's task state changes events into the queue.
        const runningEventRule = new events.Rule(this, 'RuleRunning', {
            eventPattern: {
                source: ['aws.ecs'],
                detailType: ['ECS Task State Change'],
                detail: {
                    clusterArn: [props.service.cluster.clusterArn],
                    lastStatus: ['RUNNING'],
                    desiredStatus: ['RUNNING'],
                },
            },
            targets: [
                new events_targets.SqsQueue(eventsQueue),
            ],
        });
        const stoppedEventRule = new events.Rule(this, 'RuleStopped', {
            eventPattern: {
                source: ['aws.ecs'],
                detailType: ['ECS Task State Change'],
                detail: {
                    clusterArn: [props.service.cluster.clusterArn],
                    lastStatus: ['STOPPED'],
                    desiredStatus: ['STOPPED'],
                },
            },
            targets: [
                new events_targets.SqsQueue(eventsQueue),
            ],
        });
        // Shared codebase for the lambdas.
        const code = lambda.Code.fromAsset(path.join(__dirname, 'lambda'), {
            exclude: [
                '.coverage',
                '*.pyc',
                '.idea',
            ],
        });
        // Fully qualified domain name of the record
        const recordFqdn = cdk.Fn.join('.', [props.dnsRecordName, props.dnsZone.zoneName]);
        // Allow access to manage a zone's records.
        const dnsPolicyStatement = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'route53:ChangeResourceRecordSets',
                'route53:ListResourceRecordSets',
            ],
            resources: [props.dnsZone.hostedZoneArn],
        });
        // This function consumes events from the event queue and does the work of
        // querying task IP addresses and creating, updating record sets. When there
        // are zero tasks, it deletes the record set.
        const eventHandler = new lambda.Function(this, 'EventHandler', {
            code: code,
            handler: 'index.queue_handler',
            runtime: lambda.Runtime.PYTHON_3_8,
            timeout: eventsQueueVisibilityTimeout,
            // Single-concurrency to prevent a race to set the RecordSet
            reservedConcurrentExecutions: 1,
            environment: {
                HOSTED_ZONE_ID: props.dnsZone.hostedZoneId,
                RECORD_NAME: recordFqdn,
                RECORDS_TABLE: recordsTable.tableName,
                CLUSTER_ARN: props.service.cluster.clusterArn,
                SERVICE_NAME: props.service.serviceName,
            },
            events: [
                new lambda_es.SqsEventSource(eventsQueue),
            ],
            initialPolicy: [
                // Look up task IPs
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ec2:DescribeNetworkInterfaces'],
                    resources: ['*'],
                }),
                dnsPolicyStatement,
            ],
        });
        recordsTable.grantReadWriteData(eventHandler);
        // The lambda for a custom resource provider that deletes dangling record
        // sets when the stack is deleted.
        const cleanupResourceProviderHandler = new lambda.Function(this, 'CleanupResourceProviderHandler', {
            code: code,
            handler: 'index.cleanup_resource_handler',
            runtime: lambda.Runtime.PYTHON_3_8,
            timeout: cdk.Duration.minutes(5),
            initialPolicy: [
                dnsPolicyStatement,
            ],
        });
        const cleanupResourceProvider = new customresources.Provider(this, 'CleanupResourceProvider', {
            onEventHandler: cleanupResourceProviderHandler,
        });
        const cleanupResource = new cdk.CustomResource(this, 'Cleanup', {
            serviceToken: cleanupResourceProvider.serviceToken,
            properties: {
                HostedZoneId: props.dnsZone.hostedZoneId,
                RecordName: recordFqdn,
            },
        });
        // Prime the event queue with a message so that changes to dns config are
        // quickly applied.
        const primingSdkCall = {
            service: 'SQS',
            action: 'sendMessage',
            parameters: {
                QueueUrl: eventsQueue.queueUrl,
                DelaySeconds: 10,
                MessageBody: '{ "prime": true }',
                // Add the hosted zone id and record name so that priming occurs with
                // dns config updates.
                MessageAttributes: {
                    HostedZoneId: { DataType: 'String', StringValue: props.dnsZone.hostedZoneId },
                    RecordName: { DataType: 'String', StringValue: props.dnsRecordName },
                },
            },
            physicalResourceId: customresources.PhysicalResourceId.fromResponse('MessageId'),
        };
        const primingCall = new customresources.AwsCustomResource(this, 'PrimingCall', {
            onCreate: primingSdkCall,
            onUpdate: primingSdkCall,
            policy: customresources.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['sqs:SendMessage'],
                    resources: [eventsQueue.queueArn],
                }),
            ]),
        });
        // Send the priming call after the handler is created/updated.
        primingCall.node.addDependency(eventHandler);
        // Ensure that the cleanup resource is deleted last (so it can clean up)
        props.service.taskDefinition.node.addDependency(cleanupResource);
        // Ensure that the event rules are created first so we can catch the first
        // state transitions.
        props.service.taskDefinition.node.addDependency(runningEventRule);
        props.service.taskDefinition.node.addDependency(stoppedEventRule);
    }
}
exports.TaskRecordManager = TaskRecordManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1yZWNvcmQtbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRhc2stcmVjb3JkLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkJBQTZCO0FBQzdCLGtEQUFrRDtBQUVsRCw4Q0FBOEM7QUFDOUMsOERBQThEO0FBQzlELHdDQUF3QztBQUN4Qyw4Q0FBOEM7QUFDOUMsK0RBQStEO0FBRS9ELHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFDckMsNkRBQTZEO0FBQzdELDJDQUF1QztBQVF2Qzs7O0dBR0c7QUFDSCxNQUFhLGlCQUFrQixTQUFRLHNCQUFTO0lBQzlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNkI7UUFDckUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQix3QkFBd0I7UUFDeEIsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDdEQsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCwwRUFBMEU7UUFDMUUsc0JBQXNCO1FBQ3RCLE1BQU0sNEJBQTRCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFOUQsMEVBQTBFO1FBQzFFLHlEQUF5RDtRQUN6RCxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyRCxlQUFlLEVBQUU7Z0JBQ2YsZUFBZSxFQUFFLEdBQUc7Z0JBQ3BCLEtBQUssRUFBRSxlQUFlO2FBQ3ZCO1lBQ0QsaUJBQWlCLEVBQUUsNEJBQTRCO1NBQ2hELENBQUMsQ0FBQztRQUVILCtDQUErQztRQUMvQyxNQUFNLFlBQVksR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMs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LEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO2lCQUNsQyxDQUFDO2FBQ0gsQ0FBQztTQUNILENBQUMsQ0FBQztRQUVILDhEQUE4RDtRQUM5RCxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU3Qyx3RUFBd0U7UUFDeEUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNqRSwwRUFBMEU7UUFDMUUscUJBQXFCO1FBQ3JCLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNsRSxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDcEUsQ0FBQztDQUNGO0FBdkxELDhDQXVMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdAYXdzLWNkay9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ0Bhd3MtY2RrL2F3cy1ldmVudHMnO1xuaW1wb3J0ICogYXMgZXZlbnRzX3RhcmdldHMgZnJvbSAnQGF3cy1jZGsvYXdzLWV2ZW50cy10YXJnZXRzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGxhbWJkYV9lcyBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdAYXdzLWNkay9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnQGF3cy1jZGsvYXdzLXNxcyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgKiBhcyBjdXN0b21yZXNvdXJjZXMgZnJvbSAnQGF3cy1jZGsvY3VzdG9tLXJlc291cmNlcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBUYXNrUmVjb3JkTWFuYWdlclByb3BzIHtcbiAgc2VydmljZTogZWNzLkVjMlNlcnZpY2UgfCBlY3MuRmFyZ2F0ZVNlcnZpY2U7XG4gIGRuc1pvbmU6IHJvdXRlNTMuSUhvc3RlZFpvbmU7XG4gIGRuc1JlY29yZE5hbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBbiBldmVudC1kcml2ZW4gc2VydmVybGVzcyBhcHAgdG8gbWFpbnRhaW4gYSBsaXN0IG9mIHB1YmxpYyBpcHMgaW4gYSBSb3V0ZSA1M1xuICogaG9zdGVkIHpvbmUuXG4gKi9cbmV4cG9ydCBjbGFzcyBUYXNrUmVjb3JkTWFuYWdlciBleHRlbmRzIENvbnN0cnVjdCB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBUYXNrUmVjb3JkTWFuYWdlclByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIC8vIFBvaXNvbiBwaWxscyBnbyBoZXJlLlxuICAgIGNvbnN0IGRlYWRMZXR0ZXJRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0V2ZW50c0RMJywge1xuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgfSk7XG5cbiAgICAvLyBUaW1lIGxpbWl0IGZvciBwcm9jZXNzaW5nIHF1ZXVlIGl0ZW1zIC0gd2Ugc2V0IHRoZSBsYW1iZGEgdGltZSBsaW1pdCB0b1xuICAgIC8vIHRoaXMgdmFsdWUgYXMgd2VsbC5cbiAgICBjb25zdCBldmVudHNRdWV1ZVZpc2liaWxpdHlUaW1lb3V0ID0gY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApO1xuXG4gICAgLy8gVGhpcyBxdWV1ZSBsZXRzIHVzIGJhdGNoIHRvZ2V0aGVyIGVjcyB0YXNrIHN0YXRlIGV2ZW50cy4gVGhpcyBpcyB1c2VmdWxcbiAgICAvLyBmb3Igd2hlbiB3aGVuIHdlIHdvdWxkIGJlIG90aGVyd2lzZSBib21iYXJkZWQgYnkgdGhlbS5cbiAgICBjb25zdCBldmVudHNRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0V2ZW50c1F1ZXVlJywge1xuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogNTAwLFxuICAgICAgICBxdWV1ZTogZGVhZExldHRlclF1ZXVlLFxuICAgICAgfSxcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBldmVudHNRdWV1ZVZpc2liaWxpdHlUaW1lb3V0LFxuICAgIH0pO1xuXG4gICAgLy8gU3RvcmFnZSBmb3IgdGFzayBhbmQgcmVjb3JkIHNldCBpbmZvcm1hdGlvbi5cbiAgICBjb25zdCByZWNvcmRzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1JlY29yZHMnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogJ2NsdXN0ZXJfc2VydmljZScsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gUHV0IHRoZSBjbHVzdGVyJ3MgdGFzayBzdGF0ZSBjaGFuZ2VzIGV2ZW50cyBpbnRvIHRoZSBxdWV1ZS5cbiAgICBjb25zdCBydW5uaW5nRXZlbnRSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdSdWxlUnVubmluZycsIHtcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsnYXdzLmVjcyddLFxuICAgICAgICBkZXRhaWxUeXBlOiBbJ0VDUyBUYXNrIFN0YXRlIENoYW5nZSddLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBjbHVzdGVyQXJuOiBbcHJvcHMuc2VydmljZS5jbHVzdGVyLmNsdXN0ZXJBcm5dLFxuICAgICAgICAgIGxhc3RTdGF0dXM6IFsnUlVOTklORyddLFxuICAgICAgICAgIGRlc2lyZWRTdGF0dXM6IFsnUlVOTklORyddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHRhcmdldHM6IFtcbiAgICAgICAgbmV3IGV2ZW50c190YXJnZXRzLlNxc1F1ZXVlKGV2ZW50c1F1ZXVlKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBzdG9wcGVkRXZlbnRSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdSdWxlU3RvcHBlZCcsIHtcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsnYXdzLmVjcyddLFxuICAgICAgICBkZXRhaWxUeXBlOiBbJ0VDUyBUYXNrIFN0YXRlIENoYW5nZSddLFxuICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICBjbHVzdGVyQXJuOiBbcHJvcHMuc2VydmljZS5jbHVzdGVyLmNsdXN0ZXJBcm5dLFxuICAgICAgICAgIGxhc3RTdGF0dXM6IFsnU1RPUFBFRCddLFxuICAgICAgICAgIGRlc2lyZWRTdGF0dXM6IFsnU1RPUFBFRCddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHRhcmdldHM6IFtcbiAgICAgICAgbmV3IGV2ZW50c190YXJnZXRzLlNxc1F1ZXVlKGV2ZW50c1F1ZXVlKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBTaGFyZWQgY29kZWJhc2UgZm9yIHRoZSBsYW1iZGFzLlxuICAgIGNvbnN0IGNvZGUgPSBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xhbWJkYScpLCB7XG4gICAgICBleGNsdWRlOiBbXG4gICAgICAgICcuY292ZXJhZ2UnLFxuICAgICAgICAnKi5weWMnLFxuICAgICAgICAnLmlkZWEnLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIEZ1bGx5IHF1YWxpZmllZCBkb21haW4gbmFtZSBvZiB0aGUgcmVjb3JkXG4gICAgY29uc3QgcmVjb3JkRnFkbiA9IGNkay5Gbi5qb2luKCcuJywgW3Byb3BzLmRuc1JlY29yZE5hbWUsIHByb3BzLmRuc1pvbmUuem9uZU5hbWVdKTtcblxuICAgIC8vIEFsbG93IGFjY2VzcyB0byBtYW5hZ2UgYSB6b25lJ3MgcmVjb3Jkcy5cbiAgICBjb25zdCBkbnNQb2xpY3lTdGF0ZW1lbnQgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0cycsXG4gICAgICAgICdyb3V0ZTUzOkxpc3RSZXNvdXJjZVJlY29yZFNldHMnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmRuc1pvbmUuaG9zdGVkWm9uZUFybl0sXG4gICAgfSk7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGNvbnN1bWVzIGV2ZW50cyBmcm9tIHRoZSBldmVudCBxdWV1ZSBhbmQgZG9lcyB0aGUgd29yayBvZlxuICAgIC8vIHF1ZXJ5aW5nIHRhc2sgSVAgYWRkcmVzc2VzIGFuZCBjcmVhdGluZywgdXBkYXRpbmcgcmVjb3JkIHNldHMuIFdoZW4gdGhlcmVcbiAgICAvLyBhcmUgemVybyB0YXNrcywgaXQgZGVsZXRlcyB0aGUgcmVjb3JkIHNldC5cbiAgICBjb25zdCBldmVudEhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdFdmVudEhhbmRsZXInLCB7XG4gICAgICBjb2RlOiBjb2RlLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LnF1ZXVlX2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfOCxcbiAgICAgIHRpbWVvdXQ6IGV2ZW50c1F1ZXVlVmlzaWJpbGl0eVRpbWVvdXQsXG4gICAgICAvLyBTaW5nbGUtY29uY3VycmVuY3kgdG8gcHJldmVudCBhIHJhY2UgdG8gc2V0IHRoZSBSZWNvcmRTZXRcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDEsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBIT1NURURfWk9ORV9JRDogcHJvcHMuZG5zWm9uZS5ob3N0ZWRab25lSWQsXG4gICAgICAgIFJFQ09SRF9OQU1FOiByZWNvcmRGcWRuLFxuICAgICAgICBSRUNPUkRTX1RBQkxFOiByZWNvcmRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBDTFVTVEVSX0FSTjogcHJvcHMuc2VydmljZS5jbHVzdGVyLmNsdXN0ZXJBcm4sXG4gICAgICAgIFNFUlZJQ0VfTkFNRTogcHJvcHMuc2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICAgIH0sXG4gICAgICBldmVudHM6IFtcbiAgICAgICAgbmV3IGxhbWJkYV9lcy5TcXNFdmVudFNvdXJjZShldmVudHNRdWV1ZSksXG4gICAgICBdLFxuICAgICAgaW5pdGlhbFBvbGljeTogW1xuICAgICAgICAvLyBMb29rIHVwIHRhc2sgSVBzXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogWydlYzI6RGVzY3JpYmVOZXR3b3JrSW50ZXJmYWNlcyddLFxuICAgICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICAgIH0pLFxuICAgICAgICBkbnNQb2xpY3lTdGF0ZW1lbnQsXG4gICAgICBdLFxuICAgIH0pO1xuICAgIHJlY29yZHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZXZlbnRIYW5kbGVyKTtcblxuICAgIC8vIFRoZSBsYW1iZGEgZm9yIGEgY3VzdG9tIHJlc291cmNlIHByb3ZpZGVyIHRoYXQgZGVsZXRlcyBkYW5nbGluZyByZWNvcmRcbiAgICAvLyBzZXRzIHdoZW4gdGhlIHN0YWNrIGlzIGRlbGV0ZWQuXG4gICAgY29uc3QgY2xlYW51cFJlc291cmNlUHJvdmlkZXJIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ2xlYW51cFJlc291cmNlUHJvdmlkZXJIYW5kbGVyJywge1xuICAgICAgY29kZTogY29kZSxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5jbGVhbnVwX3Jlc291cmNlX2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfOCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgaW5pdGlhbFBvbGljeTogW1xuICAgICAgICBkbnNQb2xpY3lTdGF0ZW1lbnQsXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY2xlYW51cFJlc291cmNlUHJvdmlkZXIgPSBuZXcgY3VzdG9tcmVzb3VyY2VzLlByb3ZpZGVyKHRoaXMsICdDbGVhbnVwUmVzb3VyY2VQcm92aWRlcicsIHtcbiAgICAgIG9uRXZlbnRIYW5kbGVyOiBjbGVhbnVwUmVzb3VyY2VQcm92aWRlckhhbmRsZXIsXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbGVhbnVwUmVzb3VyY2UgPSBuZXcgY2RrLkN1c3RvbVJlc291cmNlKHRoaXMsICdDbGVhbnVwJywge1xuICAgICAgc2VydmljZVRva2VuOiBjbGVhbnVwUmVzb3VyY2VQcm92aWRlci5zZXJ2aWNlVG9rZW4sXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIEhvc3RlZFpvbmVJZDogcHJvcHMuZG5zWm9uZS5ob3N0ZWRab25lSWQsXG4gICAgICAgIFJlY29yZE5hbWU6IHJlY29yZEZxZG4sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gUHJpbWUgdGhlIGV2ZW50IHF1ZXVlIHdpdGggYSBtZXNzYWdlIHNvIHRoYXQgY2hhbmdlcyB0byBkbnMgY29uZmlnIGFyZVxuICAgIC8vIHF1aWNrbHkgYXBwbGllZC5cbiAgICBjb25zdCBwcmltaW5nU2RrQ2FsbDogY3VzdG9tcmVzb3VyY2VzLkF3c1Nka0NhbGwgPSB7XG4gICAgICBzZXJ2aWNlOiAnU1FTJyxcbiAgICAgIGFjdGlvbjogJ3NlbmRNZXNzYWdlJyxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgUXVldWVVcmw6IGV2ZW50c1F1ZXVlLnF1ZXVlVXJsLFxuICAgICAgICBEZWxheVNlY29uZHM6IDEwLFxuICAgICAgICBNZXNzYWdlQm9keTogJ3sgXCJwcmltZVwiOiB0cnVlIH0nLFxuICAgICAgICAvLyBBZGQgdGhlIGhvc3RlZCB6b25lIGlkIGFuZCByZWNvcmQgbmFtZSBzbyB0aGF0IHByaW1pbmcgb2NjdXJzIHdpdGhcbiAgICAgICAgLy8gZG5zIGNvbmZpZyB1cGRhdGVzLlxuICAgICAgICBNZXNzYWdlQXR0cmlidXRlczoge1xuICAgICAgICAgIEhvc3RlZFpvbmVJZDogeyBEYXRhVHlwZTogJ1N0cmluZycsIFN0cmluZ1ZhbHVlOiBwcm9wcy5kbnNab25lLmhvc3RlZFpvbmVJZCB9LFxuICAgICAgICAgIFJlY29yZE5hbWU6IHsgRGF0YVR5cGU6ICdTdHJpbmcnLCBTdHJpbmdWYWx1ZTogcHJvcHMuZG5zUmVjb3JkTmFtZSB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHBoeXNpY2FsUmVzb3VyY2VJZDogY3VzdG9tcmVzb3VyY2VzLlBoeXNpY2FsUmVzb3VyY2VJZC5mcm9tUmVzcG9uc2UoJ01lc3NhZ2VJZCcpLFxuICAgIH07XG5cbiAgICBjb25zdCBwcmltaW5nQ2FsbCA9IG5ldyBjdXN0b21yZXNvdXJjZXMuQXdzQ3VzdG9tUmVzb3VyY2UodGhpcywgJ1ByaW1pbmdDYWxsJywge1xuICAgICAgb25DcmVhdGU6IHByaW1pbmdTZGtDYWxsLFxuICAgICAgb25VcGRhdGU6IHByaW1pbmdTZGtDYWxsLFxuICAgICAgcG9saWN5OiBjdXN0b21yZXNvdXJjZXMuQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3kuZnJvbVN0YXRlbWVudHMoW1xuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFsnc3FzOlNlbmRNZXNzYWdlJ10sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbZXZlbnRzUXVldWUucXVldWVBcm5dLFxuICAgICAgICB9KSxcbiAgICAgIF0pLFxuICAgIH0pO1xuXG4gICAgLy8gU2VuZCB0aGUgcHJpbWluZyBjYWxsIGFmdGVyIHRoZSBoYW5kbGVyIGlzIGNyZWF0ZWQvdXBkYXRlZC5cbiAgICBwcmltaW5nQ2FsbC5ub2RlLmFkZERlcGVuZGVuY3koZXZlbnRIYW5kbGVyKTtcblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBjbGVhbnVwIHJlc291cmNlIGlzIGRlbGV0ZWQgbGFzdCAoc28gaXQgY2FuIGNsZWFuIHVwKVxuICAgIHByb3BzLnNlcnZpY2UudGFza0RlZmluaXRpb24ubm9kZS5hZGREZXBlbmRlbmN5KGNsZWFudXBSZXNvdXJjZSk7XG4gICAgLy8gRW5zdXJlIHRoYXQgdGhlIGV2ZW50IHJ1bGVzIGFyZSBjcmVhdGVkIGZpcnN0IHNvIHdlIGNhbiBjYXRjaCB0aGUgZmlyc3RcbiAgICAvLyBzdGF0ZSB0cmFuc2l0aW9ucy5cbiAgICBwcm9wcy5zZXJ2aWNlLnRhc2tEZWZpbml0aW9uLm5vZGUuYWRkRGVwZW5kZW5jeShydW5uaW5nRXZlbnRSdWxlKTtcbiAgICBwcm9wcy5zZXJ2aWNlLnRhc2tEZWZpbml0aW9uLm5vZGUuYWRkRGVwZW5kZW5jeShzdG9wcGVkRXZlbnRSdWxlKTtcbiAgfVxufVxuIl19