import * as ecs from '@aws-cdk/aws-ecs';
import * as logs from '@aws-cdk/aws-logs';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import { Construct } from 'constructs';
import { Service } from '../../service';
import { ServiceExtension } from '../extension-interfaces';
/**
 * An interface that will be implemented by all the resources that can be subscribed to.
 */
export interface ISubscribable {
    /**
     * The `SubscriptionQueue` object for the `ISubscribable` object.
     *
     * @default none
     */
    readonly subscriptionQueue?: SubscriptionQueue;
    /**
     * All classes implementing this interface must also implement the `subscribe()` method
     */
    subscribe(extension: QueueExtension): sqs.IQueue;
}
/**
 * The settings for the Queue extension.
 */
export interface QueueExtensionProps {
    /**
     * The list of subscriptions for this service.
     *
     * @default none
     */
    readonly subscriptions?: ISubscribable[];
    /**
     * The user-provided default queue for this service.
     * If the `eventsQueue` is not provided, a default SQS Queue is created for the service.
     *
     * @default none
     */
    readonly eventsQueue?: sqs.IQueue;
    /**
     * The user-provided queue delay fields to configure auto scaling for the default queue.
     *
     * @default none
     */
    readonly scaleOnLatency?: QueueAutoScalingOptions;
}
/**
 * The topic-specific settings for creating the queue subscriptions.
 */
export interface TopicSubscriptionProps {
    /**
     * The SNS Topic to subscribe to.
     */
    readonly topic: sns.ITopic;
    /**
     * The user-provided queue to subscribe to the given topic.
     *
     * @default none
     * @deprecated use `topicSubscriptionQueue`
     */
    readonly queue?: sqs.IQueue;
    /**
     * The object representing topic-specific queue and corresponding queue delay fields to configure auto scaling.
     * If not provided, the default `eventsQueue` will subscribe to the given topic.
     *
     * @default none
     */
    readonly topicSubscriptionQueue?: SubscriptionQueue;
}
/**
 * `SubscriptionQueue` represents the subscription queue object which includes the topic-specific queue and its
 * corresponding auto scaling fields.
 */
interface SubscriptionQueue {
    /**
     * The user-provided queue to subscribe to the given topic.
     */
    readonly queue: sqs.IQueue;
    /**
     * The user-provided queue delay fields to configure auto scaling for the topic-specific queue.
     *
     * @default none
     */
    readonly scaleOnLatency?: QueueAutoScalingOptions;
}
/**
 * Options for configuring SQS Queue auto scaling.
 */
interface QueueAutoScalingOptions {
    /**
     * Average amount of time for processing a single message in the queue.
     */
    readonly messageProcessingTime: cdk.Duration;
    /**
     * Acceptable amount of time a message can sit in the queue (including the time required to process it).
     */
    readonly acceptableLatency: cdk.Duration;
}
/**
 * The `TopicSubscription` class represents an SNS Topic resource that can be subscribed to by the service queues.
 */
export declare class TopicSubscription implements ISubscribable {
    readonly topic: sns.ITopic;
    /**
     * The queue that subscribes to the given topic.
     *
     * @default none
     * @deprecated use `subscriptionQueue`
     */
    readonly queue?: sqs.IQueue;
    /**
     * The subscription queue object for this subscription.
     *
     * @default none
     */
    readonly subscriptionQueue?: SubscriptionQueue;
    constructor(props: TopicSubscriptionProps);
    /**
     * This method sets up SNS Topic subscriptions for the SQS queue provided by the user. If a `queue` is not provided,
     * the default `eventsQueue` subscribes to the given topic.
     *
     * @param extension `QueueExtension` added to the service
     * @returns the queue subscribed to the given topic
     */
    subscribe(extension: QueueExtension): sqs.IQueue;
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
export declare class QueueExtension extends ServiceExtension {
    private _eventsQueue;
    private _autoscalingOptions?;
    private subscriptionQueues;
    private environment;
    private props?;
    /**
     * The log group created by the extension where the AWS Lambda function logs are stored.
     */
    logGroup?: logs.ILogGroup;
    constructor(props?: QueueExtensionProps);
    /**
     * This hook creates (if required) and sets the default queue `eventsQueue`. It also sets up the subscriptions for
     * the provided `ISubscribable` objects.
     *
     * @param service The parent service which this extension has been added to
     * @param scope The scope that this extension should create resources in
     */
    prehook(service: Service, scope: Construct): void;
    /**
     * Add hooks to the main application extension so that it is modified to
     * add the events queue URL to the container environment.
     */
    addHooks(): void;
    /**
     * After the task definition has been created, this hook grants SQS permissions to the task role.
     *
     * @param taskDefinition The created task definition
     */
    useTaskDefinition(taskDefinition: ecs.TaskDefinition): void;
    /**
     * When this hook is implemented by extension, it allows the extension
     * to use the service which has been created. It is used to add target tracking
     * scaling policies for the SQS Queues of the service. It also creates an AWS Lambda
     * Function for calculating the backlog per task metric.
     *
     * @param service - The generated service.
     */
    useService(service: ecs.Ec2Service | ecs.FargateService): void;
    /**
     * This method adds a target tracking policy based on the backlog per task custom metric
     * to the auto scaling target configured for this service.
     *
     * @param queue The queue for which backlog per task metric is being configured
     * @param queueDelay The auto scaling options for the queue
     */
    private addQueueScalingPolicy;
    /**
     * This method is used to create the AWS Lambda Function for calculating backlog
     * per task metric and a Cloudwatch event trigger for this function.
     *
     * @param service - The generated service.
     */
    private createLambdaFunction;
    get eventsQueue(): sqs.IQueue;
    get autoscalingOptions(): QueueAutoScalingOptions | undefined;
}
export {};
