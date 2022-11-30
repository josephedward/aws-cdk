"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueExtension = exports.TopicSubscription = void 0;
const path = require("path");
const cloudwatch = require("@aws-cdk/aws-cloudwatch");
const events = require("@aws-cdk/aws-events");
const events_targets = require("@aws-cdk/aws-events-targets");
const iam = require("@aws-cdk/aws-iam");
const lambda = require("@aws-cdk/aws-lambda");
const logs = require("@aws-cdk/aws-logs");
const subscription = require("@aws-cdk/aws-sns-subscriptions");
const sqs = require("@aws-cdk/aws-sqs");
const cdk = require("@aws-cdk/core");
const extension_interfaces_1 = require("../extension-interfaces");
/**
 * The `TopicSubscription` class represents an SNS Topic resource that can be subscribed to by the service queues.
 */
class TopicSubscription {
    constructor(props) {
        var _a, _b;
        this.topic = props.topic;
        if (props.topicSubscriptionQueue && props.queue) {
            throw Error('Either provide the `subscriptionQueue` or the `queue` (deprecated) for the topic subscription, but not both.');
        }
        this.subscriptionQueue = props.topicSubscriptionQueue;
        this.queue = (_a = props.queue) !== null && _a !== void 0 ? _a : (_b = props.topicSubscriptionQueue) === null || _b === void 0 ? void 0 : _b.queue;
    }
    /**
     * This method sets up SNS Topic subscriptions for the SQS queue provided by the user. If a `queue` is not provided,
     * the default `eventsQueue` subscribes to the given topic.
     *
     * @param extension `QueueExtension` added to the service
     * @returns the queue subscribed to the given topic
     */
    subscribe(extension) {
        var _a, _b, _c;
        const queue = (_c = (_b = (_a = this.subscriptionQueue) === null || _a === void 0 ? void 0 : _a.queue) !== null && _b !== void 0 ? _b : this.queue) !== null && _c !== void 0 ? _c : extension.eventsQueue;
        this.topic.addSubscription(new subscription.SqsSubscription(queue));
        return queue;
    }
}
exports.TopicSubscription = TopicSubscription;
/**
 * This hook modifies the application container's environment to
 * add the queue URL for the events queue of the service.
 */
class QueueExtensionMutatingHook extends extension_interfaces_1.ContainerMutatingHook {
    constructor(props) {
        super();
        this.environment = props.environment;
    }
    mutateContainerDefinition(props) {
        return {
            ...props,
            environment: { ...(props.environment || {}), ...this.environment },
        };
    }
}
/**
 * This extension creates a default `eventsQueue` for the service (if not provided) and accepts a list of objects of
 * type `ISubscribable` that the `eventsQueue` subscribes to. It creates the subscriptions and sets up permissions
 * for the service to consume messages from the SQS Queues.
 *
 * It also configures a target tracking scaling policy for the service to maintain an acceptable queue latency by tracking
 * the backlog per task. For more information, please refer: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html .
 *
 * The default queue for this service can be accessed using the getter `<extension>.eventsQueue`.
 */
class QueueExtension extends extension_interfaces_1.ServiceExtension {
    constructor(props) {
        super('queue');
        this.subscriptionQueues = new Set();
        this.environment = {};
        this.props = props;
    }
    /**
     * This hook creates (if required) and sets the default queue `eventsQueue`. It also sets up the subscriptions for
     * the provided `ISubscribable` objects.
     *
     * @param service The parent service which this extension has been added to
     * @param scope The scope that this extension should create resources in
     */
    prehook(service, scope) {
        var _a, _b, _c, _d, _e;
        this.parentService = service;
        this.scope = scope;
        let eventsQueue = (_a = this.props) === null || _a === void 0 ? void 0 : _a.eventsQueue;
        if (!eventsQueue) {
            const deadLetterQueue = new sqs.Queue(this.scope, 'EventsDeadLetterQueue', {
                retentionPeriod: cdk.Duration.days(14),
            });
            eventsQueue = new sqs.Queue(this.scope, 'EventsQueue', {
                deadLetterQueue: {
                    queue: deadLetterQueue,
                    maxReceiveCount: 3,
                },
            });
        }
        this._eventsQueue = eventsQueue;
        this._autoscalingOptions = (_b = this.props) === null || _b === void 0 ? void 0 : _b.scaleOnLatency;
        this.environment[`${this.parentService.id.toUpperCase()}_QUEUE_URI`] = this._eventsQueue.queueUrl;
        if ((_c = this.props) === null || _c === void 0 ? void 0 : _c.subscriptions) {
            for (const subs of this.props.subscriptions) {
                const subsQueue = subs.subscribe(this);
                if (subsQueue !== this._eventsQueue) {
                    if (((_d = subs.subscriptionQueue) === null || _d === void 0 ? void 0 : _d.scaleOnLatency) && !this._autoscalingOptions) {
                        throw Error(`Autoscaling for a topic-specific queue cannot be configured as autoscaling based on SQS Queues hasn’t been set up for the service '${this.parentService.id}'. If you want to enable autoscaling for this service, please also specify 'scaleOnLatency' in the 'QueueExtension'.`);
                    }
                    const subscriptionQueue = (_e = subs.subscriptionQueue) !== null && _e !== void 0 ? _e : {
                        queue: subsQueue,
                    };
                    this.subscriptionQueues.add(subscriptionQueue);
                }
            }
        }
    }
    /**
     * Add hooks to the main application extension so that it is modified to
     * add the events queue URL to the container environment.
     */
    addHooks() {
        const container = this.parentService.serviceDescription.get('service-container');
        if (!container) {
            throw new Error('Queue Extension requires an application extension');
        }
        container.addContainerMutatingHook(new QueueExtensionMutatingHook({
            environment: this.environment,
        }));
    }
    /**
     * After the task definition has been created, this hook grants SQS permissions to the task role.
     *
     * @param taskDefinition The created task definition
     */
    useTaskDefinition(taskDefinition) {
        this._eventsQueue.grantConsumeMessages(taskDefinition.taskRole);
        for (const subsQueue of this.subscriptionQueues) {
            subsQueue.queue.grantConsumeMessages(taskDefinition.taskRole);
        }
    }
    /**
     * When this hook is implemented by extension, it allows the extension
     * to use the service which has been created. It is used to add target tracking
     * scaling policies for the SQS Queues of the service. It also creates an AWS Lambda
     * Function for calculating the backlog per task metric.
     *
     * @param service - The generated service.
     */
    useService(service) {
        var _a;
        if (!this._autoscalingOptions) {
            return;
        }
        if (!this.parentService.scalableTaskCount) {
            throw Error(`Auto scaling target for the service '${this.parentService.id}' hasn't been configured. Please use Service construct to configure 'minTaskCount' and 'maxTaskCount'.`);
        }
        this.addQueueScalingPolicy(this._eventsQueue, this._autoscalingOptions);
        for (const subsQueue of this.subscriptionQueues) {
            const autoscalingOpts = (_a = subsQueue.scaleOnLatency) !== null && _a !== void 0 ? _a : this._autoscalingOptions;
            this.addQueueScalingPolicy(subsQueue.queue, autoscalingOpts);
        }
        this.parentService.enableAutoScalingPolicy();
        this.createLambdaFunction(service);
    }
    /**
     * This method adds a target tracking policy based on the backlog per task custom metric
     * to the auto scaling target configured for this service.
     *
     * @param queue The queue for which backlog per task metric is being configured
     * @param queueDelay The auto scaling options for the queue
     */
    addQueueScalingPolicy(queue, queueDelay) {
        var _a;
        const messageProcessingTime = queueDelay.messageProcessingTime.toSeconds();
        const acceptableLatency = queueDelay.acceptableLatency.toSeconds();
        if (messageProcessingTime > acceptableLatency) {
            throw Error(`Message processing time (${messageProcessingTime}s) for the queue cannot be greater acceptable queue latency (${acceptableLatency}s).`);
        }
        const acceptableBacklog = acceptableLatency / messageProcessingTime;
        (_a = this.parentService.scalableTaskCount) === null || _a === void 0 ? void 0 : _a.scaleToTrackCustomMetric(`${queue.node.id}-autoscaling-policy`, {
            metric: new cloudwatch.Metric({
                namespace: `${this.parentService.environment.id}-${this.parentService.id}`,
                metricName: 'BacklogPerTask',
                dimensionsMap: { QueueName: queue.queueName },
                unit: cloudwatch.Unit.COUNT,
            }),
            targetValue: acceptableBacklog,
        });
    }
    /**
     * This method is used to create the AWS Lambda Function for calculating backlog
     * per task metric and a Cloudwatch event trigger for this function.
     *
     * @param service - The generated service.
     */
    createLambdaFunction(service) {
        const queueNames = [this._eventsQueue.queueName];
        this.subscriptionQueues.forEach(subs => queueNames.push(subs.queue.queueName));
        const backLogPerTaskCalculator = new lambda.Function(this.scope, 'BackLogPerTaskCalculatorFunction', {
            runtime: lambda.Runtime.PYTHON_3_9,
            code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
            handler: 'index.queue_handler',
            environment: {
                CLUSTER_NAME: this.parentService.cluster.clusterName,
                SERVICE_NAME: service.serviceName,
                NAMESPACE: `${this.parentService.environment.id}-${this.parentService.id}`,
                QUEUE_NAMES: queueNames.join(','),
            },
            initialPolicy: [new iam.PolicyStatement({
                    actions: ['ecs:DescribeServices'],
                    resources: [`${service.serviceArn}`],
                    conditions: {
                        ArnEquals: {
                            'ecs:cluster': this.parentService.cluster.clusterArn,
                        },
                    },
                })],
        });
        const queueArns = [this._eventsQueue.queueArn];
        this.subscriptionQueues.forEach(subs => queueArns.push(subs.queue.queueArn));
        backLogPerTaskCalculator.grantPrincipal.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl',
            ],
            resources: queueArns,
        }));
        new events.Rule(this.scope, 'BacklogPerTaskScheduledRule', {
            schedule: events.Schedule.rate(cdk.Duration.seconds(60)),
            targets: [new events_targets.LambdaFunction(backLogPerTaskCalculator)],
        });
        this.logGroup = new logs.LogGroup(this.scope, `${this.parentService.id}-BackLogPerTaskCalculatorLogs`, {
            logGroupName: `/aws/lambda/${backLogPerTaskCalculator.functionName}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.THREE_DAYS,
        });
    }
    get eventsQueue() {
        return this._eventsQueue;
    }
    get autoscalingOptions() {
        return this._autoscalingOptions;
    }
}
exports.QueueExtension = QueueExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVldWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJxdWV1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0Isc0RBQXNEO0FBRXRELDhDQUE4QztBQUM5Qyw4REFBOEQ7QUFDOUQsd0NBQXdDO0FBQ3hDLDhDQUE4QztBQUM5QywwQ0FBMEM7QUFFMUMsK0RBQStEO0FBQy9ELHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFJckMsa0VBQWtGO0FBeUdsRjs7R0FFRztBQUNILE1BQWEsaUJBQWlCO0lBa0I1QixZQUFZLEtBQTZCOztRQUN2QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFFekIsSUFBSSxLQUFLLENBQUMsc0JBQXNCLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRTtZQUMvQyxNQUFNLEtBQUssQ0FBQyw4R0FBOEcsQ0FBQyxDQUFDO1NBQzdIO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztRQUN0RCxJQUFJLENBQUMsS0FBSyxTQUFHLEtBQUssQ0FBQyxLQUFLLHlDQUFJLEtBQUssQ0FBQyxzQkFBc0IsMENBQUUsS0FBSyxDQUFDO0lBQ2xFLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxTQUFTLENBQUMsU0FBeUI7O1FBQ3hDLE1BQU0sS0FBSyxxQkFBRyxJQUFJLENBQUMsaUJBQWlCLDBDQUFFLEtBQUssbUNBQUksSUFBSSxDQUFDLEtBQUssbUNBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQztRQUNuRixJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNwRSxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7Q0FDRjtBQXhDRCw4Q0F3Q0M7QUFhRDs7O0dBR0c7QUFDSCxNQUFNLDBCQUEyQixTQUFRLDRDQUFxQjtJQUc1RCxZQUFZLEtBQTZCO1FBQ3ZDLEtB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dGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWR3YXRjaCc7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnQGF3cy1jZGsvYXdzLWV2ZW50cyc7XG5pbXBvcnQgKiBhcyBldmVudHNfdGFyZ2V0cyBmcm9tICdAYXdzLWNkay9hd3MtZXZlbnRzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ0Bhd3MtY2RrL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdAYXdzLWNkay9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnQGF3cy1jZGsvYXdzLXNucyc7XG5pbXBvcnQgKiBhcyBzdWJzY3JpcHRpb24gZnJvbSAnQGF3cy1jZGsvYXdzLXNucy1zdWJzY3JpcHRpb25zJztcbmltcG9ydCAqIGFzIHNxcyBmcm9tICdAYXdzLWNkay9hd3Mtc3FzJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2UnO1xuaW1wb3J0IHsgQ29udGFpbmVyIH0gZnJvbSAnLi4vY29udGFpbmVyJztcbmltcG9ydCB7IENvbnRhaW5lck11dGF0aW5nSG9vaywgU2VydmljZUV4dGVuc2lvbiB9IGZyb20gJy4uL2V4dGVuc2lvbi1pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBBbiBpbnRlcmZhY2UgdGhhdCB3aWxsIGJlIGltcGxlbWVudGVkIGJ5IGFsbCB0aGUgcmVzb3VyY2VzIHRoYXQgY2FuIGJlIHN1YnNjcmliZWQgdG8uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSVN1YnNjcmliYWJsZSB7XG4gIC8qKlxuICAgKiBUaGUgYFN1YnNjcmlwdGlvblF1ZXVlYCBvYmplY3QgZm9yIHRoZSBgSVN1YnNjcmliYWJsZWAgb2JqZWN0LlxuICAgKlxuICAgKiBAZGVmYXVsdCBub25lXG4gICAqL1xuICByZWFkb25seSBzdWJzY3JpcHRpb25RdWV1ZT86IFN1YnNjcmlwdGlvblF1ZXVlO1xuXG4gIC8qKlxuICAgKiBBbGwgY2xhc3NlcyBpbXBsZW1lbnRpbmcgdGhpcyBpbnRlcmZhY2UgbXVzdCBhbHNvIGltcGxlbWVudCB0aGUgYHN1YnNjcmliZSgpYCBtZXRob2RcbiAgICovXG4gIHN1YnNjcmliZShleHRlbnNpb246IFF1ZXVlRXh0ZW5zaW9uKTogc3FzLklRdWV1ZTtcbn1cblxuLyoqXG4gKiBUaGUgc2V0dGluZ3MgZm9yIHRoZSBRdWV1ZSBleHRlbnNpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUXVldWVFeHRlbnNpb25Qcm9wcyB7XG4gIC8qKlxuICAgKiBUaGUgbGlzdCBvZiBzdWJzY3JpcHRpb25zIGZvciB0aGlzIHNlcnZpY2UuXG4gICAqXG4gICAqIEBkZWZhdWx0IG5vbmVcbiAgICovXG4gIHJlYWRvbmx5IHN1YnNjcmlwdGlvbnM/OiBJU3Vic2NyaWJhYmxlW107XG5cbiAgLyoqXG4gICAqIFRoZSB1c2VyLXByb3ZpZGVkIGRlZmF1bHQgcXVldWUgZm9yIHRoaXMgc2VydmljZS5cbiAgICogSWYgdGhlIGBldmVudHNRdWV1ZWAgaXMgbm90IHByb3ZpZGVkLCBhIGRlZmF1bHQgU1FTIFF1ZXVlIGlzIGNyZWF0ZWQgZm9yIHRoZSBzZXJ2aWNlLlxuICAgKlxuICAgKiBAZGVmYXVsdCBub25lXG4gICAqL1xuICByZWFkb25seSBldmVudHNRdWV1ZT86IHNxcy5JUXVldWU7XG5cbiAgLyoqXG4gICAqIFRoZSB1c2VyLXByb3ZpZGVkIHF1ZXVlIGRlbGF5IGZpZWxkcyB0byBjb25maWd1cmUgYXV0byBzY2FsaW5nIGZvciB0aGUgZGVmYXVsdCBxdWV1ZS5cbiAgICpcbiAgICogQGRlZmF1bHQgbm9uZVxuICAgKi9cbiAgcmVhZG9ubHkgc2NhbGVPbkxhdGVuY3k/OiBRdWV1ZUF1dG9TY2FsaW5nT3B0aW9ucztcbn1cblxuLyoqXG4gKiBUaGUgdG9waWMtc3BlY2lmaWMgc2V0dGluZ3MgZm9yIGNyZWF0aW5nIHRoZSBxdWV1ZSBzdWJzY3JpcHRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRvcGljU3Vic2NyaXB0aW9uUHJvcHMge1xuICAvKipcbiAgICogVGhlIFNOUyBUb3BpYyB0byBzdWJzY3JpYmUgdG8uXG4gICAqL1xuICByZWFkb25seSB0b3BpYzogc25zLklUb3BpYztcblxuICAvKipcbiAgICogVGhlIHVzZXItcHJvdmlkZWQgcXVldWUgdG8gc3Vic2NyaWJlIHRvIHRoZSBnaXZlbiB0b3BpYy5cbiAgICpcbiAgICogQGRlZmF1bHQgbm9uZVxuICAgKiBAZGVwcmVjYXRlZCB1c2UgYHRvcGljU3Vic2NyaXB0aW9uUXVldWVgXG4gICAqL1xuICByZWFkb25seSBxdWV1ZT86IHNxcy5JUXVldWU7XG5cbiAgLyoqXG4gICAqIFRoZSBvYmplY3QgcmVwcmVzZW50aW5nIHRvcGljLXNwZWNpZmljIHF1ZXVlIGFuZCBjb3JyZXNwb25kaW5nIHF1ZXVlIGRlbGF5IGZpZWxkcyB0byBjb25maWd1cmUgYXV0byBzY2FsaW5nLlxuICAgKiBJZiBub3QgcHJvdmlkZWQsIHRoZSBkZWZhdWx0IGBldmVudHNRdWV1ZWAgd2lsbCBzdWJzY3JpYmUgdG8gdGhlIGdpdmVuIHRvcGljLlxuICAgKlxuICAgKiBAZGVmYXVsdCBub25lXG4gICAqL1xuICByZWFkb25seSB0b3BpY1N1YnNjcmlwdGlvblF1ZXVlPzogU3Vic2NyaXB0aW9uUXVldWU7XG59XG5cbi8qKlxuICogYFN1YnNjcmlwdGlvblF1ZXVlYCByZXByZXNlbnRzIHRoZSBzdWJzY3JpcHRpb24gcXVldWUgb2JqZWN0IHdoaWNoIGluY2x1ZGVzIHRoZSB0b3BpYy1zcGVjaWZpYyBxdWV1ZSBhbmQgaXRzXG4gKiBjb3JyZXNwb25kaW5nIGF1dG8gc2NhbGluZyBmaWVsZHMuXG4gKi9cbmludGVyZmFjZSBTdWJzY3JpcHRpb25RdWV1ZSB7XG4gIC8qKlxuICAgKiBUaGUgdXNlci1wcm92aWRlZCBxdWV1ZSB0byBzdWJzY3JpYmUgdG8gdGhlIGdpdmVuIHRvcGljLlxuICAgKi9cbiAgcmVhZG9ubHkgcXVldWU6IHNxcy5JUXVldWU7XG5cbiAgLyoqXG4gICAqIFRoZSB1c2VyLXByb3ZpZGVkIHF1ZXVlIGRlbGF5IGZpZWxkcyB0byBjb25maWd1cmUgYXV0byBzY2FsaW5nIGZvciB0aGUgdG9waWMtc3BlY2lmaWMgcXVldWUuXG4gICAqXG4gICAqIEBkZWZhdWx0IG5vbmVcbiAgICovXG4gIHJlYWRvbmx5IHNjYWxlT25MYXRlbmN5PzogUXVldWVBdXRvU2NhbGluZ09wdGlvbnM7XG59XG5cbi8qKlxuICogT3B0aW9ucyBmb3IgY29uZmlndXJpbmcgU1FTIFF1ZXVlIGF1dG8gc2NhbGluZy5cbiAqL1xuaW50ZXJmYWNlIFF1ZXVlQXV0b1NjYWxpbmdPcHRpb25zIHtcbiAgLyoqXG4gICAqIEF2ZXJhZ2UgYW1vdW50IG9mIHRpbWUgZm9yIHByb2Nlc3NpbmcgYSBzaW5nbGUgbWVzc2FnZSBpbiB0aGUgcXVldWUuXG4gICAqL1xuICByZWFkb25seSBtZXNzYWdlUHJvY2Vzc2luZ1RpbWU6IGNkay5EdXJhdGlvbjtcblxuICAvKipcbiAgICogQWNjZXB0YWJsZSBhbW91bnQgb2YgdGltZSBhIG1lc3NhZ2UgY2FuIHNpdCBpbiB0aGUgcXVldWUgKGluY2x1ZGluZyB0aGUgdGltZSByZXF1aXJlZCB0byBwcm9jZXNzIGl0KS5cbiAgICovXG4gIHJlYWRvbmx5IGFjY2VwdGFibGVMYXRlbmN5OiBjZGsuRHVyYXRpb247XG59XG5cbi8qKlxuICogVGhlIGBUb3BpY1N1YnNjcmlwdGlvbmAgY2xhc3MgcmVwcmVzZW50cyBhbiBTTlMgVG9waWMgcmVzb3VyY2UgdGhhdCBjYW4gYmUgc3Vic2NyaWJlZCB0byBieSB0aGUgc2VydmljZSBxdWV1ZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBUb3BpY1N1YnNjcmlwdGlvbiBpbXBsZW1lbnRzIElTdWJzY3JpYmFibGUge1xuICBwdWJsaWMgcmVhZG9ubHkgdG9waWM6IHNucy5JVG9waWM7XG5cbiAgLyoqXG4gICAqIFRoZSBxdWV1ZSB0aGF0IHN1YnNjcmliZXMgdG8gdGhlIGdpdmVuIHRvcGljLlxuICAgKlxuICAgKiBAZGVmYXVsdCBub25lXG4gICAqIEBkZXByZWNhdGVkIHVzZSBgc3Vic2NyaXB0aW9uUXVldWVgXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcXVldWU/OiBzcXMuSVF1ZXVlO1xuXG4gIC8qKlxuICAgKiBUaGUgc3Vic2NyaXB0aW9uIHF1ZXVlIG9iamVjdCBmb3IgdGhpcyBzdWJzY3JpcHRpb24uXG4gICAqXG4gICAqIEBkZWZhdWx0IG5vbmVcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBzdWJzY3JpcHRpb25RdWV1ZT86IFN1YnNjcmlwdGlvblF1ZXVlO1xuXG4gIGNvbnN0cnVjdG9yKHByb3BzOiBUb3BpY1N1YnNjcmlwdGlvblByb3BzKSB7XG4gICAgdGhpcy50b3BpYyA9IHByb3BzLnRvcGljO1xuXG4gICAgaWYgKHByb3BzLnRvcGljU3Vic2NyaXB0aW9uUXVldWUgJiYgcHJvcHMucXVldWUpIHtcbiAgICAgIHRocm93IEVycm9yKCdFaXRoZXIgcHJvdmlkZSB0aGUgYHN1YnNjcmlwdGlvblF1ZXVlYCBvciB0aGUgYHF1ZXVlYCAoZGVwcmVjYXRlZCkgZm9yIHRoZSB0b3BpYyBzdWJzY3JpcHRpb24sIGJ1dCBub3QgYm90aC4nKTtcbiAgICB9XG4gICAgdGhpcy5zdWJzY3JpcHRpb25RdWV1ZSA9IHByb3BzLnRvcGljU3Vic2NyaXB0aW9uUXVldWU7XG4gICAgdGhpcy5xdWV1ZSA9IHByb3BzLnF1ZXVlID8/IHByb3BzLnRvcGljU3Vic2NyaXB0aW9uUXVldWU/LnF1ZXVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIHNldHMgdXAgU05TIFRvcGljIHN1YnNjcmlwdGlvbnMgZm9yIHRoZSBTUVMgcXVldWUgcHJvdmlkZWQgYnkgdGhlIHVzZXIuIElmIGEgYHF1ZXVlYCBpcyBub3QgcHJvdmlkZWQsXG4gICAqIHRoZSBkZWZhdWx0IGBldmVudHNRdWV1ZWAgc3Vic2NyaWJlcyB0byB0aGUgZ2l2ZW4gdG9waWMuXG4gICAqXG4gICAqIEBwYXJhbSBleHRlbnNpb24gYFF1ZXVlRXh0ZW5zaW9uYCBhZGRlZCB0byB0aGUgc2VydmljZVxuICAgKiBAcmV0dXJucyB0aGUgcXVldWUgc3Vic2NyaWJlZCB0byB0aGUgZ2l2ZW4gdG9waWNcbiAgICovXG4gIHB1YmxpYyBzdWJzY3JpYmUoZXh0ZW5zaW9uOiBRdWV1ZUV4dGVuc2lvbikgOiBzcXMuSVF1ZXVlIHtcbiAgICBjb25zdCBxdWV1ZSA9IHRoaXMuc3Vic2NyaXB0aW9uUXVldWU/LnF1ZXVlID8/IHRoaXMucXVldWUgPz8gZXh0ZW5zaW9uLmV2ZW50c1F1ZXVlO1xuICAgIHRoaXMudG9waWMuYWRkU3Vic2NyaXB0aW9uKG5ldyBzdWJzY3JpcHRpb24uU3FzU3Vic2NyaXB0aW9uKHF1ZXVlKSk7XG4gICAgcmV0dXJuIHF1ZXVlO1xuICB9XG59XG5cbi8qKlxuICogU2V0dGluZ3MgZm9yIHRoZSBob29rIHdoaWNoIG11dGF0ZXMgdGhlIGFwcGxpY2F0aW9uIGNvbnRhaW5lclxuICogdG8gYWRkIHRoZSBldmVudHMgcXVldWUgVVJJIHRvIGl0cyBlbnZpcm9ubWVudC5cbiAqL1xuaW50ZXJmYWNlIENvbnRhaW5lck11dGF0aW5nUHJvcHMge1xuICAvKipcbiAgICogVGhlIGV2ZW50cyBxdWV1ZSBuYW1lIGFuZCBVUkkgdG8gYmUgYWRkZWQgdG8gdGhlIGNvbnRhaW5lciBlbnZpcm9ubWVudC5cbiAgICovXG4gIHJlYWRvbmx5IGVudmlyb25tZW50OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xufVxuXG4vKipcbiAqIFRoaXMgaG9vayBtb2RpZmllcyB0aGUgYXBwbGljYXRpb24gY29udGFpbmVyJ3MgZW52aXJvbm1lbnQgdG9cbiAqIGFkZCB0aGUgcXVldWUgVVJMIGZvciB0aGUgZXZlbnRzIHF1ZXVlIG9mIHRoZSBzZXJ2aWNlLlxuICovXG5jbGFzcyBRdWV1ZUV4dGVuc2lvbk11dGF0aW5nSG9vayBleHRlbmRzIENvbnRhaW5lck11dGF0aW5nSG9vayB7XG4gIHByaXZhdGUgZW52aXJvbm1lbnQ6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH07XG5cbiAgY29uc3RydWN0b3IocHJvcHM6IENvbnRhaW5lck11dGF0aW5nUHJvcHMpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuZW52aXJvbm1lbnQgPSBwcm9wcy5lbnZpcm9ubWVudDtcbiAgfVxuXG4gIHB1YmxpYyBtdXRhdGVDb250YWluZXJEZWZpbml0aW9uKHByb3BzOiBlY3MuQ29udGFpbmVyRGVmaW5pdGlvbk9wdGlvbnMpOiBlY3MuQ29udGFpbmVyRGVmaW5pdGlvbk9wdGlvbnMge1xuICAgIHJldHVybiB7XG4gICAgICAuLi5wcm9wcyxcblxuICAgICAgZW52aXJvbm1lbnQ6IHsgLi4uKHByb3BzLmVudmlyb25tZW50IHx8IHt9KSwgLi4udGhpcy5lbnZpcm9ubWVudCB9LFxuICAgIH0gYXMgZWNzLkNvbnRhaW5lckRlZmluaXRpb25PcHRpb25zO1xuICB9XG59XG5cbi8qKlxuICogVGhpcyBleHRlbnNpb24gY3JlYXRlcyBhIGRlZmF1bHQgYGV2ZW50c1F1ZXVlYCBmb3IgdGhlIHNlcnZpY2UgKGlmIG5vdCBwcm92aWRlZCkgYW5kIGFjY2VwdHMgYSBsaXN0IG9mIG9iamVjdHMgb2ZcbiAqIHR5cGUgYElTdWJzY3JpYmFibGVgIHRoYXQgdGhlIGBldmVudHNRdWV1ZWAgc3Vic2NyaWJlcyB0by4gSXQgY3JlYXRlcyB0aGUgc3Vic2NyaXB0aW9ucyBhbmQgc2V0cyB1cCBwZXJtaXNzaW9uc1xuICogZm9yIHRoZSBzZXJ2aWNlIHRvIGNvbnN1bWUgbWVzc2FnZXMgZnJvbSB0aGUgU1FTIFF1ZXVlcy5cbiAqXG4gKiBJdCBhbHNvIGNvbmZpZ3VyZXMgYSB0YXJnZXQgdHJhY2tpbmcgc2NhbGluZyBwb2xpY3kgZm9yIHRoZSBzZXJ2aWNlIHRvIG1haW50YWluIGFuIGFjY2VwdGFibGUgcXVldWUgbGF0ZW5jeSBieSB0cmFja2luZ1xuICogdGhlIGJhY2tsb2cgcGVyIHRhc2suIEZvciBtb3JlIGluZm9ybWF0aW9uLCBwbGVhc2UgcmVmZXI6IGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9hdXRvc2NhbGluZy9lYzIvdXNlcmd1aWRlL2FzLXVzaW5nLXNxcy1xdWV1ZS5odG1sIC5cbiAqXG4gKiBUaGUgZGVmYXVsdCBxdWV1ZSBmb3IgdGhpcyBzZXJ2aWNlIGNhbiBiZSBhY2Nlc3NlZCB1c2luZyB0aGUgZ2V0dGVyIGA8ZXh0ZW5zaW9uPi5ldmVudHNRdWV1ZWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBRdWV1ZUV4dGVuc2lvbiBleHRlbmRzIFNlcnZpY2VFeHRlbnNpb24ge1xuICBwcml2YXRlIF9ldmVudHNRdWV1ZSE6IHNxcy5JUXVldWU7XG5cbiAgcHJpdmF0ZSBfYXV0b3NjYWxpbmdPcHRpb25zPzogUXVldWVBdXRvU2NhbGluZ09wdGlvbnM7XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb25RdWV1ZXMgPSBuZXcgU2V0PFN1YnNjcmlwdGlvblF1ZXVlPigpO1xuXG4gIHByaXZhdGUgZW52aXJvbm1lbnQ6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0gPSB7fTtcblxuICBwcml2YXRlIHByb3BzPzogUXVldWVFeHRlbnNpb25Qcm9wcztcblxuICAvKipcbiAgICogVGhlIGxvZyBncm91cCBjcmVhdGVkIGJ5IHRoZSBleHRlbnNpb24gd2hlcmUgdGhlIEFXUyBMYW1iZGEgZnVuY3Rpb24gbG9ncyBhcmUgc3RvcmVkLlxuICAgKi9cbiAgcHVibGljIGxvZ0dyb3VwPzogbG9ncy5JTG9nR3JvdXA7XG5cbiAgY29uc3RydWN0b3IocHJvcHM/OiBRdWV1ZUV4dGVuc2lvblByb3BzKSB7XG4gICAgc3VwZXIoJ3F1ZXVlJyk7XG5cbiAgICB0aGlzLnByb3BzID0gcHJvcHM7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBob29rIGNyZWF0ZXMgKGlmIHJlcXVpcmVkKSBhbmQgc2V0cyB0aGUgZGVmYXVsdCBxdWV1ZSBgZXZlbnRzUXVldWVgLiBJdCBhbHNvIHNldHMgdXAgdGhlIHN1YnNjcmlwdGlvbnMgZm9yXG4gICAqIHRoZSBwcm92aWRlZCBgSVN1YnNjcmliYWJsZWAgb2JqZWN0cy5cbiAgICpcbiAgICogQHBhcmFtIHNlcnZpY2UgVGhlIHBhcmVudCBzZXJ2aWNlIHdoaWNoIHRoaXMgZXh0ZW5zaW9uIGhhcyBiZWVuIGFkZGVkIHRvXG4gICAqIEBwYXJhbSBzY29wZSBUaGUgc2NvcGUgdGhhdCB0aGlzIGV4dGVuc2lvbiBzaG91bGQgY3JlYXRlIHJlc291cmNlcyBpblxuICAgKi9cbiAgcHVibGljIHByZWhvb2soc2VydmljZTogU2VydmljZSwgc2NvcGU6IENvbnN0cnVjdCkge1xuICAgIHRoaXMucGFyZW50U2VydmljZSA9IHNlcnZpY2U7XG4gICAgdGhpcy5zY29wZSA9IHNjb3BlO1xuXG4gICAgbGV0IGV2ZW50c1F1ZXVlID0gdGhpcy5wcm9wcz8uZXZlbnRzUXVldWU7XG4gICAgaWYgKCFldmVudHNRdWV1ZSkge1xuICAgICAgY29uc3QgZGVhZExldHRlclF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLnNjb3BlLCAnRXZlbnRzRGVhZExldHRlclF1ZXVlJywge1xuICAgICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgIH0pO1xuXG4gICAgICBldmVudHNRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcy5zY29wZSwgJ0V2ZW50c1F1ZXVlJywge1xuICAgICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgICBxdWV1ZTogZGVhZExldHRlclF1ZXVlLFxuICAgICAgICAgIG1heFJlY2VpdmVDb3VudDogMyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHNRdWV1ZSA9IGV2ZW50c1F1ZXVlO1xuICAgIHRoaXMuX2F1dG9zY2FsaW5nT3B0aW9ucyA9IHRoaXMucHJvcHM/LnNjYWxlT25MYXRlbmN5O1xuXG4gICAgdGhpcy5lbnZpcm9ubWVudFtgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWQudG9VcHBlckNhc2UoKX1fUVVFVUVfVVJJYF0gPSB0aGlzLl9ldmVudHNRdWV1ZS5xdWV1ZVVybDtcblxuICAgIGlmICh0aGlzLnByb3BzPy5zdWJzY3JpcHRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IHN1YnMgb2YgdGhpcy5wcm9wcy5zdWJzY3JpcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IHN1YnNRdWV1ZSA9IHN1YnMuc3Vic2NyaWJlKHRoaXMpO1xuICAgICAgICBpZiAoc3Vic1F1ZXVlICE9PSB0aGlzLl9ldmVudHNRdWV1ZSkge1xuICAgICAgICAgIGlmIChzdWJzLnN1YnNjcmlwdGlvblF1ZXVlPy5zY2FsZU9uTGF0ZW5jeSAmJiAhdGhpcy5fYXV0b3NjYWxpbmdPcHRpb25zKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihgQXV0b3NjYWxpbmcgZm9yIGEgdG9waWMtc3BlY2lmaWMgcXVldWUgY2Fubm90IGJlIGNvbmZpZ3VyZWQgYXMgYXV0b3NjYWxpbmcgYmFzZWQgb24gU1FTIFF1ZXVlcyBoYXNu4oCZdCBiZWVuIHNldCB1cCBmb3IgdGhlIHNlcnZpY2UgJyR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfScuIElmIHlvdSB3YW50IHRvIGVuYWJsZSBhdXRvc2NhbGluZyBmb3IgdGhpcyBzZXJ2aWNlLCBwbGVhc2UgYWxzbyBzcGVjaWZ5ICdzY2FsZU9uTGF0ZW5jeScgaW4gdGhlICdRdWV1ZUV4dGVuc2lvbicuYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvblF1ZXVlID0gc3Vicy5zdWJzY3JpcHRpb25RdWV1ZSA/PyB7XG4gICAgICAgICAgICBxdWV1ZTogc3Vic1F1ZXVlLFxuICAgICAgICAgIH0gYXMgU3Vic2NyaXB0aW9uUXVldWU7XG4gICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25RdWV1ZXMuYWRkKHN1YnNjcmlwdGlvblF1ZXVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgaG9va3MgdG8gdGhlIG1haW4gYXBwbGljYXRpb24gZXh0ZW5zaW9uIHNvIHRoYXQgaXQgaXMgbW9kaWZpZWQgdG9cbiAgICogYWRkIHRoZSBldmVudHMgcXVldWUgVVJMIHRvIHRoZSBjb250YWluZXIgZW52aXJvbm1lbnQuXG4gICAqL1xuICBwdWJsaWMgYWRkSG9va3MoKSB7XG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy5wYXJlbnRTZXJ2aWNlLnNlcnZpY2VEZXNjcmlwdGlvbi5nZXQoJ3NlcnZpY2UtY29udGFpbmVyJykgYXMgQ29udGFpbmVyO1xuXG4gICAgaWYgKCFjb250YWluZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUXVldWUgRXh0ZW5zaW9uIHJlcXVpcmVzIGFuIGFwcGxpY2F0aW9uIGV4dGVuc2lvbicpO1xuICAgIH1cblxuICAgIGNvbnRhaW5lci5hZGRDb250YWluZXJNdXRhdGluZ0hvb2sobmV3IFF1ZXVlRXh0ZW5zaW9uTXV0YXRpbmdIb29rKHtcbiAgICAgIGVudmlyb25tZW50OiB0aGlzLmVudmlyb25tZW50LFxuICAgIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZnRlciB0aGUgdGFzayBkZWZpbml0aW9uIGhhcyBiZWVuIGNyZWF0ZWQsIHRoaXMgaG9vayBncmFudHMgU1FTIHBlcm1pc3Npb25zIHRvIHRoZSB0YXNrIHJvbGUuXG4gICAqXG4gICAqIEBwYXJhbSB0YXNrRGVmaW5pdGlvbiBUaGUgY3JlYXRlZCB0YXNrIGRlZmluaXRpb25cbiAgICovXG4gIHB1YmxpYyB1c2VUYXNrRGVmaW5pdGlvbih0YXNrRGVmaW5pdGlvbjogZWNzLlRhc2tEZWZpbml0aW9uKSB7XG4gICAgdGhpcy5fZXZlbnRzUXVldWUuZ3JhbnRDb25zdW1lTWVzc2FnZXModGFza0RlZmluaXRpb24udGFza1JvbGUpO1xuICAgIGZvciAoY29uc3Qgc3Vic1F1ZXVlIG9mIHRoaXMuc3Vic2NyaXB0aW9uUXVldWVzKSB7XG4gICAgICBzdWJzUXVldWUucXVldWUuZ3JhbnRDb25zdW1lTWVzc2FnZXModGFza0RlZmluaXRpb24udGFza1JvbGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBXaGVuIHRoaXMgaG9vayBpcyBpbXBsZW1lbnRlZCBieSBleHRlbnNpb24sIGl0IGFsbG93cyB0aGUgZXh0ZW5zaW9uXG4gICAqIHRvIHVzZSB0aGUgc2VydmljZSB3aGljaCBoYXMgYmVlbiBjcmVhdGVkLiBJdCBpcyB1c2VkIHRvIGFkZCB0YXJnZXQgdHJhY2tpbmdcbiAgICogc2NhbGluZyBwb2xpY2llcyBmb3IgdGhlIFNRUyBRdWV1ZXMgb2YgdGhlIHNlcnZpY2UuIEl0IGFsc28gY3JlYXRlcyBhbiBBV1MgTGFtYmRhXG4gICAqIEZ1bmN0aW9uIGZvciBjYWxjdWxhdGluZyB0aGUgYmFja2xvZyBwZXIgdGFzayBtZXRyaWMuXG4gICAqXG4gICAqIEBwYXJhbSBzZXJ2aWNlIC0gVGhlIGdlbmVyYXRlZCBzZXJ2aWNlLlxuICAgKi9cbiAgcHVibGljIHVzZVNlcnZpY2Uoc2VydmljZTogZWNzLkVjMlNlcnZpY2UgfCBlY3MuRmFyZ2F0ZVNlcnZpY2UpIHtcbiAgICBpZiAoIXRoaXMuX2F1dG9zY2FsaW5nT3B0aW9ucykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXMucGFyZW50U2VydmljZS5zY2FsYWJsZVRhc2tDb3VudCkge1xuICAgICAgdGhyb3cgRXJyb3IoYEF1dG8gc2NhbGluZyB0YXJnZXQgZm9yIHRoZSBzZXJ2aWNlICcke3RoaXMucGFyZW50U2VydmljZS5pZH0nIGhhc24ndCBiZWVuIGNvbmZpZ3VyZWQuIFBsZWFzZSB1c2UgU2VydmljZSBjb25zdHJ1Y3QgdG8gY29uZmlndXJlICdtaW5UYXNrQ291bnQnIGFuZCAnbWF4VGFza0NvdW50Jy5gKTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZFF1ZXVlU2NhbGluZ1BvbGljeSh0aGlzLl9ldmVudHNRdWV1ZSwgdGhpcy5fYXV0b3NjYWxpbmdPcHRpb25zKTtcbiAgICBmb3IgKGNvbnN0IHN1YnNRdWV1ZSBvZiB0aGlzLnN1YnNjcmlwdGlvblF1ZXVlcykge1xuICAgICAgY29uc3QgYXV0b3NjYWxpbmdPcHRzID0gc3Vic1F1ZXVlLnNjYWxlT25MYXRlbmN5ID8/IHRoaXMuX2F1dG9zY2FsaW5nT3B0aW9ucztcbiAgICAgIHRoaXMuYWRkUXVldWVTY2FsaW5nUG9saWN5KHN1YnNRdWV1ZS5xdWV1ZSwgYXV0b3NjYWxpbmdPcHRzISk7XG4gICAgfVxuICAgIHRoaXMucGFyZW50U2VydmljZS5lbmFibGVBdXRvU2NhbGluZ1BvbGljeSgpO1xuXG4gICAgdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbihzZXJ2aWNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBhZGRzIGEgdGFyZ2V0IHRyYWNraW5nIHBvbGljeSBiYXNlZCBvbiB0aGUgYmFja2xvZyBwZXIgdGFzayBjdXN0b20gbWV0cmljXG4gICAqIHRvIHRoZSBhdXRvIHNjYWxpbmcgdGFyZ2V0IGNvbmZpZ3VyZWQgZm9yIHRoaXMgc2VydmljZS5cbiAgICpcbiAgICogQHBhcmFtIHF1ZXVlIFRoZSBxdWV1ZSBmb3Igd2hpY2ggYmFja2xvZyBwZXIgdGFzayBtZXRyaWMgaXMgYmVpbmcgY29uZmlndXJlZFxuICAgKiBAcGFyYW0gcXVldWVEZWxheSBUaGUgYXV0byBzY2FsaW5nIG9wdGlvbnMgZm9yIHRoZSBxdWV1ZVxuICAgKi9cbiAgcHJpdmF0ZSBhZGRRdWV1ZVNjYWxpbmdQb2xpY3kocXVldWU6IHNxcy5JUXVldWUsIHF1ZXVlRGVsYXk6IFF1ZXVlQXV0b1NjYWxpbmdPcHRpb25zKSB7XG4gICAgY29uc3QgbWVzc2FnZVByb2Nlc3NpbmdUaW1lID0gcXVldWVEZWxheS5tZXNzYWdlUHJvY2Vzc2luZ1RpbWUudG9TZWNvbmRzKCk7XG4gICAgY29uc3QgYWNjZXB0YWJsZUxhdGVuY3kgPSBxdWV1ZURlbGF5LmFjY2VwdGFibGVMYXRlbmN5LnRvU2Vjb25kcygpO1xuICAgIGlmIChtZXNzYWdlUHJvY2Vzc2luZ1RpbWUgPiBhY2NlcHRhYmxlTGF0ZW5jeSkge1xuICAgICAgdGhyb3cgRXJyb3IoYE1lc3NhZ2UgcHJvY2Vzc2luZyB0aW1lICgke21lc3NhZ2VQcm9jZXNzaW5nVGltZX1zKSBmb3IgdGhlIHF1ZXVlIGNhbm5vdCBiZSBncmVhdGVyIGFjY2VwdGFibGUgcXVldWUgbGF0ZW5jeSAoJHthY2NlcHRhYmxlTGF0ZW5jeX1zKS5gKTtcbiAgICB9XG4gICAgY29uc3QgYWNjZXB0YWJsZUJhY2tsb2cgPSBhY2NlcHRhYmxlTGF0ZW5jeS9tZXNzYWdlUHJvY2Vzc2luZ1RpbWU7XG5cbiAgICB0aGlzLnBhcmVudFNlcnZpY2Uuc2NhbGFibGVUYXNrQ291bnQ/LnNjYWxlVG9UcmFja0N1c3RvbU1ldHJpYyhgJHtxdWV1ZS5ub2RlLmlkfS1hdXRvc2NhbGluZy1wb2xpY3lgLCB7XG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogYCR7dGhpcy5wYXJlbnRTZXJ2aWNlLmVudmlyb25tZW50LmlkfS0ke3RoaXMucGFyZW50U2VydmljZS5pZH1gLFxuICAgICAgICBtZXRyaWNOYW1lOiAnQmFja2xvZ1BlclRhc2snLFxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7IFF1ZXVlTmFtZTogcXVldWUucXVldWVOYW1lIH0sXG4gICAgICAgIHVuaXQ6IGNsb3Vkd2F0Y2guVW5pdC5DT1VOVCxcbiAgICAgIH0pLFxuICAgICAgdGFyZ2V0VmFsdWU6IGFjY2VwdGFibGVCYWNrbG9nLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gY3JlYXRlIHRoZSBBV1MgTGFtYmRhIEZ1bmN0aW9uIGZvciBjYWxjdWxhdGluZyBiYWNrbG9nXG4gICAqIHBlciB0YXNrIG1ldHJpYyBhbmQgYSBDbG91ZHdhdGNoIGV2ZW50IHRyaWdnZXIgZm9yIHRoaXMgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBzZXJ2aWNlIC0gVGhlIGdlbmVyYXRlZCBzZXJ2aWNlLlxuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVMYW1iZGFGdW5jdGlvbihzZXJ2aWNlOiBlY3MuRWMyU2VydmljZSB8IGVjcy5GYXJnYXRlU2VydmljZSkge1xuICAgIGNvbnN0IHF1ZXVlTmFtZXMgPSBbdGhpcy5fZXZlbnRzUXVldWUucXVldWVOYW1lXTtcbiAgICB0aGlzLnN1YnNjcmlwdGlvblF1ZXVlcy5mb3JFYWNoKHN1YnMgPT4gcXVldWVOYW1lcy5wdXNoKHN1YnMucXVldWUucXVldWVOYW1lKSk7XG5cbiAgICBjb25zdCBiYWNrTG9nUGVyVGFza0NhbGN1bGF0b3IgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMuc2NvcGUsICdCYWNrTG9nUGVyVGFza0NhbGN1bGF0b3JGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzksXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xhbWJkYScpKSxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5xdWV1ZV9oYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIENMVVNURVJfTkFNRTogdGhpcy5wYXJlbnRTZXJ2aWNlLmNsdXN0ZXIuY2x1c3Rlck5hbWUsXG4gICAgICAgIFNFUlZJQ0VfTkFNRTogc2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICAgICAgTkFNRVNQQUNFOiBgJHt0aGlzLnBhcmVudFNlcnZpY2UuZW52aXJvbm1lbnQuaWR9LSR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfWAsXG4gICAgICAgIFFVRVVFX05BTUVTOiBxdWV1ZU5hbWVzLmpvaW4oJywnKSxcbiAgICAgIH0sXG4gICAgICBpbml0aWFsUG9saWN5OiBbbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbJ2VjczpEZXNjcmliZVNlcnZpY2VzJ10sXG4gICAgICAgIHJlc291cmNlczogW2Ake3NlcnZpY2Uuc2VydmljZUFybn1gXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIEFybkVxdWFsczoge1xuICAgICAgICAgICAgJ2VjczpjbHVzdGVyJzogdGhpcy5wYXJlbnRTZXJ2aWNlLmNsdXN0ZXIuY2x1c3RlckFybixcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSldLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcXVldWVBcm5zID0gW3RoaXMuX2V2ZW50c1F1ZXVlLnF1ZXVlQXJuXTtcbiAgICB0aGlzLnN1YnNjcmlwdGlvblF1ZXVlcy5mb3JFYWNoKHN1YnMgPT4gcXVldWVBcm5zLnB1c2goc3Vicy5xdWV1ZS5xdWV1ZUFybikpO1xuICAgIGJhY2tMb2dQZXJUYXNrQ2FsY3VsYXRvci5ncmFudFByaW5jaXBhbC5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzcXM6R2V0UXVldWVBdHRyaWJ1dGVzJyxcbiAgICAgICAgJ3NxczpHZXRRdWV1ZVVybCcsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBxdWV1ZUFybnMsXG4gICAgfSkpO1xuXG4gICAgbmV3IGV2ZW50cy5SdWxlKHRoaXMuc2NvcGUsICdCYWNrbG9nUGVyVGFza1NjaGVkdWxlZFJ1bGUnLCB7XG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLnJhdGUoY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApKSxcbiAgICAgIHRhcmdldHM6IFtuZXcgZXZlbnRzX3RhcmdldHMuTGFtYmRhRnVuY3Rpb24oYmFja0xvZ1BlclRhc2tDYWxjdWxhdG9yKV0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcy5zY29wZSwgYCR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfS1CYWNrTG9nUGVyVGFza0NhbGN1bGF0b3JMb2dzYCwge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9sYW1iZGEvJHtiYWNrTG9nUGVyVGFza0NhbGN1bGF0b3IuZnVuY3Rpb25OYW1lfWAsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuVEhSRUVfREFZUyxcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgZXZlbnRzUXVldWUoKSA6IHNxcy5JUXVldWUge1xuICAgIHJldHVybiB0aGlzLl9ldmVudHNRdWV1ZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgYXV0b3NjYWxpbmdPcHRpb25zKCkgOiBRdWV1ZUF1dG9TY2FsaW5nT3B0aW9ucyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX2F1dG9zY2FsaW5nT3B0aW9ucztcbiAgfVxufVxuIl19