"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const ecs = require("@aws-cdk/aws-ecs");
const sns = require("@aws-cdk/aws-sns");
const sqs = require("@aws-cdk/aws-sqs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('queue', () => {
    test('should only create a default queue when no input props are provided', () => {
        // GIVEN
        const stack = new cdk.Stack();
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
            environment: {
                PORT: '80',
            },
        }));
        // WHEN
        serviceDescription.add(new lib_1.QueueExtension());
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        // Ensure creation of default queue and queue policy allowing SNS Topics to send message to the queue
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
            MessageRetentionPeriod: 1209600,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
            RedrivePolicy: {
                deadLetterTargetArn: {
                    'Fn::GetAtt': [
                        'EventsDeadLetterQueue404572C7',
                        'Arn',
                    ],
                },
                maxReceiveCount: 3,
            },
        });
        // Ensure the task role is given permissions to consume messages from the queue
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            'sqs:ReceiveMessage',
                            'sqs:ChangeMessageVisibility',
                            'sqs:GetQueueUrl',
                            'sqs:DeleteMessage',
                            'sqs:GetQueueAttributes',
                        ],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [
                                'EventsQueueB96EB0D2',
                                'Arn',
                            ],
                        },
                    },
                ],
                Version: '2012-10-17',
            },
        });
        // Ensure there are no SNS Subscriptions created
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::SNS::Subscription', 0);
        // Ensure that the queue URL has been correctly appended to the environment variables
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    Environment: [
                        {
                            Name: 'PORT',
                            Value: '80',
                        },
                        {
                            Name: 'MY-SERVICE_QUEUE_URI',
                            Value: {
                                Ref: 'EventsQueueB96EB0D2',
                            },
                        },
                    ],
                    Image: 'nathanpeck/name',
                    Essential: true,
                    Memory: 512,
                    Name: 'app',
                    PortMappings: [
                        {
                            ContainerPort: 80,
                            Protocol: 'tcp',
                        },
                    ],
                    Ulimits: [
                        {
                            HardLimit: 1024000,
                            Name: 'nofile',
                            SoftLimit: 1024000,
                        },
                    ],
                },
            ],
        });
    });
    test('should be able to subscribe default events queue created by the extension to given topics', () => {
        // GIVEN
        const stack = new cdk.Stack();
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
            environment: {
                PORT: '80',
            },
        }));
        // WHEN
        const topicSubscription1 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic1'),
        });
        const topicSubscription2 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic2'),
        });
        serviceDescription.add(new lib_1.QueueExtension({
            subscriptions: [topicSubscription1, topicSubscription2],
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        // Ensure creation of default queue and queue policy allowing SNS Topics to send message to the queue
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
            MessageRetentionPeriod: 1209600,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SQS::Queue', {
            RedrivePolicy: {
                deadLetterTargetArn: {
                    'Fn::GetAtt': [
                        'EventsDeadLetterQueue404572C7',
                        'Arn',
                    ],
                },
                maxReceiveCount: 3,
            },
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SQS::QueuePolicy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'sqs:SendMessage',
                        Condition: {
                            ArnEquals: {
                                'aws:SourceArn': {
                                    Ref: 'topic152D84A37',
                                },
                            },
                        },
                        Effect: 'Allow',
                        Principal: {
                            Service: 'sns.amazonaws.com',
                        },
                        Resource: {
                            'Fn::GetAtt': [
                                'EventsQueueB96EB0D2',
                                'Arn',
                            ],
                        },
                    },
                    {
                        Action: 'sqs:SendMessage',
                        Condition: {
                            ArnEquals: {
                                'aws:SourceArn': {
                                    Ref: 'topic2A4FB547F',
                                },
                            },
                        },
                        Effect: 'Allow',
                        Principal: {
                            Service: 'sns.amazonaws.com',
                        },
                        Resource: {
                            'Fn::GetAtt': [
                                'EventsQueueB96EB0D2',
                                'Arn',
                            ],
                        },
                    },
                ],
                Version: '2012-10-17',
            },
        });
        // Ensure the task role is given permissions to consume messages from the queue
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            'sqs:ReceiveMessage',
                            'sqs:ChangeMessageVisibility',
                            'sqs:GetQueueUrl',
                            'sqs:DeleteMessage',
                            'sqs:GetQueueAttributes',
                        ],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [
                                'EventsQueueB96EB0D2',
                                'Arn',
                            ],
                        },
                    },
                ],
                Version: '2012-10-17',
            },
        });
        // Ensure SNS Subscriptions for given topics
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SNS::Subscription', {
            Protocol: 'sqs',
            TopicArn: {
                Ref: 'topic152D84A37',
            },
            Endpoint: {
                'Fn::GetAtt': [
                    'EventsQueueB96EB0D2',
                    'Arn',
                ],
            },
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SNS::Subscription', {
            Protocol: 'sqs',
            TopicArn: {
                Ref: 'topic2A4FB547F',
            },
            Endpoint: {
                'Fn::GetAtt': [
                    'EventsQueueB96EB0D2',
                    'Arn',
                ],
            },
        });
        // Ensure that the queue URL has been correctly appended to the environment variables
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    Environment: [
                        {
                            Name: 'PORT',
                            Value: '80',
                        },
                        {
                            Name: 'MY-SERVICE_QUEUE_URI',
                            Value: {
                                Ref: 'EventsQueueB96EB0D2',
                            },
                        },
                    ],
                    Image: 'nathanpeck/name',
                    Essential: true,
                    Memory: 512,
                    Name: 'app',
                    PortMappings: [
                        {
                            ContainerPort: 80,
                            Protocol: 'tcp',
                        },
                    ],
                    Ulimits: [
                        {
                            HardLimit: 1024000,
                            Name: 'nofile',
                            SoftLimit: 1024000,
                        },
                    ],
                },
            ],
        });
    });
    test('should be able to subscribe user-provided queue to given topics', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        const topicSubscription1 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic1'),
            topicSubscriptionQueue: {
                queue: new sqs.Queue(stack, 'myQueue'),
            },
        });
        const topicSubscription2 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic2'),
        });
        serviceDescription.add(new lib_1.QueueExtension({
            subscriptions: [topicSubscription1, topicSubscription2],
            eventsQueue: new sqs.Queue(stack, 'defQueue'),
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        // Ensure queue policy allows SNS Topics to send message to the queue
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SQS::QueuePolicy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'sqs:SendMessage',
                        Condition: {
                            ArnEquals: {
                                'aws:SourceArn': {
                                    Ref: 'topic152D84A37',
                                },
                            },
                        },
                        Effect: 'Allow',
                        Principal: {
                            Service: 'sns.amazonaws.com',
                        },
                        Resource: {
                            'Fn::GetAtt': [
                                'myQueue4FDFF71C',
                                'Arn',
                            ],
                        },
                    },
                ],
                Version: '2012-10-17',
            },
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SQS::QueuePolicy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'sqs:SendMessage',
                        Condition: {
                            ArnEquals: {
                                'aws:SourceArn': {
                                    Ref: 'topic2A4FB547F',
                                },
                            },
                        },
                        Effect: 'Allow',
                        Principal: {
                            Service: 'sns.amazonaws.com',
                        },
                        Resource: {
                            'Fn::GetAtt': [
                                'defQueue1F91A65B',
                                'Arn',
                            ],
                        },
                    },
                ],
                Version: '2012-10-17',
            },
        });
        // Ensure the task role is given permissions to consume messages from the queue
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            'sqs:ReceiveMessage',
                            'sqs:ChangeMessageVisibility',
                            'sqs:GetQueueUrl',
                            'sqs:DeleteMessage',
                            'sqs:GetQueueAttributes',
                        ],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [
                                'defQueue1F91A65B',
                                'Arn',
                            ],
                        },
                    },
                    {
                        Action: [
                            'sqs:ReceiveMessage',
                            'sqs:ChangeMessageVisibility',
                            'sqs:GetQueueUrl',
                            'sqs:DeleteMessage',
                            'sqs:GetQueueAttributes',
                        ],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [
                                'myQueue4FDFF71C',
                                'Arn',
                            ],
                        },
                    },
                ],
                Version: '2012-10-17',
            },
        });
        // Ensure SNS Subscriptions for given topics
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SNS::Subscription', {
            Protocol: 'sqs',
            TopicArn: {
                Ref: 'topic152D84A37',
            },
            Endpoint: {
                'Fn::GetAtt': [
                    'myQueue4FDFF71C',
                    'Arn',
                ],
            },
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::SNS::Subscription', {
            Protocol: 'sqs',
            TopicArn: {
                Ref: 'topic2A4FB547F',
            },
            Endpoint: {
                'Fn::GetAtt': [
                    'defQueue1F91A65B',
                    'Arn',
                ],
            },
        });
        // Ensure that the queue URL has been correctly added to the environment variables
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    Environment: [
                        {
                            Name: 'MY-SERVICE_QUEUE_URI',
                            Value: {
                                Ref: 'defQueue1F91A65B',
                            },
                        },
                    ],
                    Image: 'nathanpeck/name',
                    Essential: true,
                    Memory: 512,
                    Name: 'app',
                    PortMappings: [
                        {
                            ContainerPort: 80,
                            Protocol: 'tcp',
                        },
                    ],
                    Ulimits: [
                        {
                            HardLimit: 1024000,
                            Name: 'nofile',
                            SoftLimit: 1024000,
                        },
                    ],
                },
            ],
        });
    });
    test('should error when providing both the subscriptionQueue and queue (deprecated) props for a topic subscription', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        // THEN
        expect(() => {
            new lib_1.TopicSubscription({
                topic: new sns.Topic(stack, 'topic1'),
                queue: new sqs.Queue(stack, 'delete-queue'),
                topicSubscriptionQueue: {
                    queue: new sqs.Queue(stack, 'sign-up-queue'),
                },
            });
        }).toThrow('Either provide the `subscriptionQueue` or the `queue` (deprecated) for the topic subscription, but not both.');
    });
    test('should be able to add target tracking scaling policy for the Events Queue with no subscriptions', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        serviceDescription.add(new lib_1.QueueExtension({
            scaleOnLatency: {
                acceptableLatency: cdk.Duration.minutes(5),
                messageProcessingTime: cdk.Duration.seconds(20),
            },
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            autoScaleTaskCount: {
                maxTaskCount: 10,
            },
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MaxCapacity: 10,
            MinCapacity: 1,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: {
                CustomizedMetricSpecification: {
                    Dimensions: [
                        {
                            Name: 'QueueName',
                            Value: {
                                'Fn::GetAtt': [
                                    'EventsQueueB96EB0D2',
                                    'QueueName',
                                ],
                            },
                        },
                    ],
                    MetricName: 'BacklogPerTask',
                    Namespace: 'production-my-service',
                    Statistic: 'Average',
                    Unit: 'Count',
                },
                TargetValue: 15,
            },
        });
    });
    test('should be able to add target tracking scaling policy for the SQS Queues', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        const topicSubscription1 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic1'),
            topicSubscriptionQueue: {
                queue: new sqs.Queue(stack, 'myQueue'),
                scaleOnLatency: {
                    acceptableLatency: cdk.Duration.minutes(10),
                    messageProcessingTime: cdk.Duration.seconds(20),
                },
            },
        });
        const topicSubscription2 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic2'),
            queue: new sqs.Queue(stack, 'tempQueue'),
        });
        serviceDescription.add(new lib_1.QueueExtension({
            subscriptions: [topicSubscription1, topicSubscription2],
            eventsQueue: new sqs.Queue(stack, 'defQueue'),
            scaleOnLatency: {
                acceptableLatency: cdk.Duration.minutes(5),
                messageProcessingTime: cdk.Duration.seconds(20),
            },
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            autoScaleTaskCount: {
                maxTaskCount: 10,
            },
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MaxCapacity: 10,
            MinCapacity: 1,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: {
                CustomizedMetricSpecification: {
                    Dimensions: [
                        {
                            Name: 'QueueName',
                            Value: {
                                'Fn::GetAtt': [
                                    'defQueue1F91A65B',
                                    'QueueName',
                                ],
                            },
                        },
                    ],
                    MetricName: 'BacklogPerTask',
                    Namespace: 'production-my-service',
                    Statistic: 'Average',
                    Unit: 'Count',
                },
                TargetValue: 15,
            },
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: {
                CustomizedMetricSpecification: {
                    Dimensions: [
                        {
                            Name: 'QueueName',
                            Value: {
                                'Fn::GetAtt': [
                                    'myQueue4FDFF71C',
                                    'QueueName',
                                ],
                            },
                        },
                    ],
                    MetricName: 'BacklogPerTask',
                    Namespace: 'production-my-service',
                    Statistic: 'Average',
                    Unit: 'Count',
                },
                TargetValue: 30,
            },
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: {
                CustomizedMetricSpecification: {
                    Dimensions: [
                        {
                            Name: 'QueueName',
                            Value: {
                                'Fn::GetAtt': [
                                    'tempQueueEF946882',
                                    'QueueName',
                                ],
                            },
                        },
                    ],
                    MetricName: 'BacklogPerTask',
                    Namespace: 'production-my-service',
                    Statistic: 'Average',
                    Unit: 'Count',
                },
                TargetValue: 15,
            },
        });
    });
    test('should error when adding scaling policy if scaling target has not been configured', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        const topicSubscription1 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic1'),
        });
        serviceDescription.add(new lib_1.QueueExtension({
            subscriptions: [topicSubscription1],
            scaleOnLatency: {
                acceptableLatency: cdk.Duration.minutes(10),
                messageProcessingTime: cdk.Duration.seconds(20),
            },
        }));
        // THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
            });
        }).toThrow(/Auto scaling target for the service 'my-service' hasn't been configured. Please use Service construct to configure 'minTaskCount' and 'maxTaskCount'./);
    });
    test('should error when message processing time for the queue is greater than acceptable latency', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        const topicSubscription1 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic1'),
            topicSubscriptionQueue: {
                queue: new sqs.Queue(stack, 'sign-up-queue'),
            },
        });
        serviceDescription.add(new lib_1.QueueExtension({
            subscriptions: [topicSubscription1],
            scaleOnLatency: {
                acceptableLatency: cdk.Duration.seconds(10),
                messageProcessingTime: cdk.Duration.seconds(20),
            },
        }));
        // THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
                autoScaleTaskCount: {
                    maxTaskCount: 10,
                },
            });
        }).toThrow('Message processing time (20s) for the queue cannot be greater acceptable queue latency (10s).');
    });
    test('should error when configuring auto scaling only for topic-specific queue', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const environment = new lib_1.Environment(stack, 'production');
        const serviceDescription = new lib_1.ServiceDescription();
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        const topicSubscription1 = new lib_1.TopicSubscription({
            topic: new sns.Topic(stack, 'topic1'),
            topicSubscriptionQueue: {
                queue: new sqs.Queue(stack, 'sign-up-queue'),
                scaleOnLatency: {
                    acceptableLatency: cdk.Duration.minutes(10),
                    messageProcessingTime: cdk.Duration.seconds(20),
                },
            },
        });
        serviceDescription.add(new lib_1.QueueExtension({
            subscriptions: [topicSubscription1],
        }));
        // THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
                autoScaleTaskCount: {
                    maxTaskCount: 10,
                },
            });
        }).toThrow(/Autoscaling for a topic-specific queue cannot be configured as autoscaling based on SQS Queues hasn’t been set up for the service 'my-service'. If you want to enable autoscaling for this service, please also specify 'scaleOnLatency' in the 'QueueExtension'/);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVldWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInF1ZXVlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxvREFBK0M7QUFDL0Msd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4Qyx3Q0FBd0M7QUFDeEMscUNBQXFDO0FBQ3JDLGdDQUFnSDtBQUVoSCxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUNyQixJQUFJLENBQUMscUVBQXFFLEVBQUUsR0FBRyxFQUFFO1FBQy9FLFFBQVE7UUFDUixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5QixNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx3QkFBa0IsRUFBRSxDQUFDO1FBRXBELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQVMsQ0FBQztZQUNuQyxHQUFHLEVBQUUsR0FBRztZQUNSLFNBQVMsRUFBRSxHQUFHO1lBQ2QsV0FBVyxFQUFFLEVBQUU7WUFDZixLQUFLLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7WUFDekQsV0FBVyxFQUFFO2dCQUNYLElBQUksRUFBRSxJQUFJO2FBQ1g7U0FDRixDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU87UUFDUCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxvQkFBYyxFQUFFLENBQUMsQ0FBQztRQUU3QyxJQUFJLGFBQU8sQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFO1lBQy9CLFdBQVc7WUFDWCxrQkFBa0I7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTztRQUNQLHFHQUFxRztRQUNyRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRTtZQUNqRSxzQkFBc0IsRUFBRSxPQUFP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QUFDLEtBQUssRUFBRSxZQUFZLEVBQUU7Z0JBQy9CLFdBQVc7Z0JBQ1gsa0JBQWtCO2dCQUNsQixrQkFBa0IsRUFBRTtvQkFDbEIsWUFBWSxFQUFFLEVBQUU7aUJBQ2pCO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGtRQUFrUSxDQUFDLENBQUM7SUFDalIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnQGF3cy1jZGsvYXdzLXNucyc7XG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnQGF3cy1jZGsvYXdzLXNxcyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBDb250YWluZXIsIEVudmlyb25tZW50LCBRdWV1ZUV4dGVuc2lvbiwgU2VydmljZSwgU2VydmljZURlc2NyaXB0aW9uLCBUb3BpY1N1YnNjcmlwdGlvbiB9IGZyb20gJy4uL2xpYic7XG5cbmRlc2NyaWJlKCdxdWV1ZScsICgpID0+IHtcbiAgdGVzdCgnc2hvdWxkIG9ubHkgY3JlYXRlIGEgZGVmYXVsdCBxdWV1ZSB3aGVuIG5vIGlucHV0IHByb3BzIGFyZSBwcm92aWRlZCcsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQT1JUOiAnODAnLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICAvLyBXSEVOXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgUXVldWVFeHRlbnNpb24oKSk7XG5cbiAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICAvLyBFbnN1cmUgY3JlYXRpb24gb2YgZGVmYXVsdCBxdWV1ZSBhbmQgcXVldWUgcG9saWN5IGFsbG93aW5nIFNOUyBUb3BpY3MgdG8gc2VuZCBtZXNzYWdlIHRvIHRoZSBxdWV1ZVxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlNRUzo6UXVldWUnLCB7XG4gICAgICBNZXNzYWdlUmV0ZW50aW9uUGVyaW9kOiAxMjA5NjAwLFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U1FTOjpRdWV1ZScsIHtcbiAgICAgIFJlZHJpdmVQb2xpY3k6IHtcbiAgICAgICAgZGVhZExldHRlclRhcmdldEFybjoge1xuICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgJ0V2ZW50c0RlYWRMZXR0ZXJRdWV1ZTQwNDU3MkM3JyxcbiAgICAgICAgICAgICdBcm4nLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBFbnN1cmUgdGhlIHRhc2sgcm9sZSBpcyBnaXZlbiBwZXJtaXNzaW9ucyB0byBjb25zdW1lIG1lc3NhZ2VzIGZyb20gdGhlIHF1ZXVlXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XG4gICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBBY3Rpb246IFtcbiAgICAgICAgICAgICAgJ3NxczpSZWNlaXZlTWVzc2FnZScsXG4gICAgICAgICAgICAgICdzcXM6Q2hhbmdlTWVzc2FnZVZpc2liaWxpdHknLFxuICAgICAgICAgICAgICAnc3FzOkdldFF1ZXVlVXJsJyxcbiAgICAgICAgICAgICAgJ3NxczpEZWxldGVNZXNzYWdlJyxcbiAgICAgICAgICAgICAgJ3NxczpHZXRRdWV1ZUF0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgIFJlc291cmNlOiB7XG4gICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICAgICdFdmVudHNRdWV1ZUI5NkVCMEQyJyxcbiAgICAgICAgICAgICAgICAnQXJuJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgVmVyc2lvbjogJzIwMTItMTAtMTcnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEVuc3VyZSB0aGVyZSBhcmUgbm8gU05TIFN1YnNjcmlwdGlvbnMgY3JlYXRlZFxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykucmVzb3VyY2VDb3VudElzKCdBV1M6OlNOUzo6U3Vic2NyaXB0aW9uJywgMCk7XG5cbiAgICAvLyBFbnN1cmUgdGhhdCB0aGUgcXVldWUgVVJMIGhhcyBiZWVuIGNvcnJlY3RseSBhcHBlbmRlZCB0byB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgIENvbnRhaW5lckRlZmluaXRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBDcHU6IDI1NixcbiAgICAgICAgICBFbnZpcm9ubWVudDogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiAnUE9SVCcsXG4gICAgICAgICAgICAgIFZhbHVlOiAnODAnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ01ZLVNFUlZJQ0VfUVVFVUVfVVJJJyxcbiAgICAgICAgICAgICAgVmFsdWU6IHtcbiAgICAgICAgICAgICAgICBSZWY6ICdFdmVudHNRdWV1ZUI5NkVCMEQyJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBJbWFnZTogJ25hdGhhbnBlY2svbmFtZScsXG4gICAgICAgICAgRXNzZW50aWFsOiB0cnVlLFxuICAgICAgICAgIE1lbW9yeTogNTEyLFxuICAgICAgICAgIE5hbWU6ICdhcHAnLFxuICAgICAgICAgIFBvcnRNYXBwaW5nczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb250YWluZXJQb3J0OiA4MCxcbiAgICAgICAgICAgICAgUHJvdG9jb2w6ICd0Y3AnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFVsaW1pdHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgSGFyZExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgICBOYW1lOiAnbm9maWxlJyxcbiAgICAgICAgICAgICAgU29mdExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gc3Vic2NyaWJlIGRlZmF1bHQgZXZlbnRzIHF1ZXVlIGNyZWF0ZWQgYnkgdGhlIGV4dGVuc2lvbiB0byBnaXZlbiB0b3BpY3MnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUE9SVDogJzgwJyxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHRvcGljU3Vic2NyaXB0aW9uMSA9IG5ldyBUb3BpY1N1YnNjcmlwdGlvbih7XG4gICAgICB0b3BpYzogbmV3IHNucy5Ub3BpYyhzdGFjaywgJ3RvcGljMScpLFxuICAgIH0pO1xuICAgIGNvbnN0IHRvcGljU3Vic2NyaXB0aW9uMiA9IG5ldyBUb3BpY1N1YnNjcmlwdGlvbih7XG4gICAgICB0b3BpYzogbmV3IHNucy5Ub3BpYyhzdGFjaywgJ3RvcGljMicpLFxuICAgIH0pO1xuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IFF1ZXVlRXh0ZW5zaW9uKHtcbiAgICAgIHN1YnNjcmlwdGlvbnM6IFt0b3BpY1N1YnNjcmlwdGlvbjEsIHRvcGljU3Vic2NyaXB0aW9uMl0sXG4gICAgfSkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgLy8gRW5zdXJlIGNyZWF0aW9uIG9mIGRlZmF1bHQgcXVldWUgYW5kIHF1ZXVlIHBvbGljeSBhbGxvd2luZyBTTlMgVG9waWNzIHRvIHNlbmQgbWVzc2FnZSB0byB0aGUgcXVldWVcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTUVM6OlF1ZXVlJywge1xuICAgICAgTWVzc2FnZVJldGVudGlvblBlcmlvZDogMTIwOTYwMCxcbiAgICB9KTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlNRUzo6UXVldWUnLCB7XG4gICAgICBSZWRyaXZlUG9saWN5OiB7XG4gICAgICAgIGRlYWRMZXR0ZXJUYXJnZXRBcm46IHtcbiAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgICdFdmVudHNEZWFkTGV0dGVyUXVldWU0MDQ1NzJDNycsXG4gICAgICAgICAgICAnQXJuJyxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U1FTOjpRdWV1ZVBvbGljeScsIHtcbiAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEFjdGlvbjogJ3NxczpTZW5kTWVzc2FnZScsXG4gICAgICAgICAgICBDb25kaXRpb246IHtcbiAgICAgICAgICAgICAgQXJuRXF1YWxzOiB7XG4gICAgICAgICAgICAgICAgJ2F3czpTb3VyY2VBcm4nOiB7XG4gICAgICAgICAgICAgICAgICBSZWY6ICd0b3BpYzE1MkQ4NEEzNycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICBQcmluY2lwYWw6IHtcbiAgICAgICAgICAgICAgU2VydmljZTogJ3Nucy5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBSZXNvdXJjZToge1xuICAgICAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgICAgICAnRXZlbnRzUXVldWVCOTZFQjBEMicsXG4gICAgICAgICAgICAgICAgJ0FybicsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgQWN0aW9uOiAnc3FzOlNlbmRNZXNzYWdlJyxcbiAgICAgICAgICAgIENvbmRpdGlvbjoge1xuICAgICAgICAgICAgICBBcm5FcXVhbHM6IHtcbiAgICAgICAgICAgICAgICAnYXdzOlNvdXJjZUFybic6IHtcbiAgICAgICAgICAgICAgICAgIFJlZjogJ3RvcGljMkE0RkI1NDdGJyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcbiAgICAgICAgICAgIFByaW5jaXBhbDoge1xuICAgICAgICAgICAgICBTZXJ2aWNlOiAnc25zLmFtYXpvbmF3cy5jb20nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFJlc291cmNlOiB7XG4gICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICAgICdFdmVudHNRdWV1ZUI5NkVCMEQyJyxcbiAgICAgICAgICAgICAgICAnQXJuJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgVmVyc2lvbjogJzIwMTItMTAtMTcnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEVuc3VyZSB0aGUgdGFzayByb2xlIGlzIGdpdmVuIHBlcm1pc3Npb25zIHRvIGNvbnN1bWUgbWVzc2FnZXMgZnJvbSB0aGUgcXVldWVcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcbiAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgICAnc3FzOlJlY2VpdmVNZXNzYWdlJyxcbiAgICAgICAgICAgICAgJ3NxczpDaGFuZ2VNZXNzYWdlVmlzaWJpbGl0eScsXG4gICAgICAgICAgICAgICdzcXM6R2V0UXVldWVVcmwnLFxuICAgICAgICAgICAgICAnc3FzOkRlbGV0ZU1lc3NhZ2UnLFxuICAgICAgICAgICAgICAnc3FzOkdldFF1ZXVlQXR0cmlidXRlcycsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgUmVzb3VyY2U6IHtcbiAgICAgICAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgICAgICAgJ0V2ZW50c1F1ZXVlQjk2RUIwRDInLFxuICAgICAgICAgICAgICAgICdBcm4nLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBWZXJzaW9uOiAnMjAxMi0xMC0xNycsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gRW5zdXJlIFNOUyBTdWJzY3JpcHRpb25zIGZvciBnaXZlbiB0b3BpY3NcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTTlM6OlN1YnNjcmlwdGlvbicsIHtcbiAgICAgIFByb3RvY29sOiAnc3FzJyxcbiAgICAgIFRvcGljQXJuOiB7XG4gICAgICAgIFJlZjogJ3RvcGljMTUyRDg0QTM3JyxcbiAgICAgIH0sXG4gICAgICBFbmRwb2ludDoge1xuICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAnRXZlbnRzUXVldWVCOTZFQjBEMicsXG4gICAgICAgICAgJ0FybicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U05TOjpTdWJzY3JpcHRpb24nLCB7XG4gICAgICBQcm90b2NvbDogJ3NxcycsXG4gICAgICBUb3BpY0Fybjoge1xuICAgICAgICBSZWY6ICd0b3BpYzJBNEZCNTQ3RicsXG4gICAgICB9LFxuICAgICAgRW5kcG9pbnQ6IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ0V2ZW50c1F1ZXVlQjk2RUIwRDInLFxuICAgICAgICAgICdBcm4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBxdWV1ZSBVUkwgaGFzIGJlZW4gY29ycmVjdGx5IGFwcGVuZGVkIHRvIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIENwdTogMjU2LFxuICAgICAgICAgIEVudmlyb25tZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6ICdQT1JUJyxcbiAgICAgICAgICAgICAgVmFsdWU6ICc4MCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiAnTVktU0VSVklDRV9RVUVVRV9VUkknLFxuICAgICAgICAgICAgICBWYWx1ZToge1xuICAgICAgICAgICAgICAgIFJlZjogJ0V2ZW50c1F1ZXVlQjk2RUIwRDInLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIEltYWdlOiAnbmF0aGFucGVjay9uYW1lJyxcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgTWVtb3J5OiA1MTIsXG4gICAgICAgICAgTmFtZTogJ2FwcCcsXG4gICAgICAgICAgUG9ydE1hcHBpbmdzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIENvbnRhaW5lclBvcnQ6IDgwLFxuICAgICAgICAgICAgICBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgVWxpbWl0czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBIYXJkTGltaXQ6IDEwMjQwMDAsXG4gICAgICAgICAgICAgIE5hbWU6ICdub2ZpbGUnLFxuICAgICAgICAgICAgICBTb2Z0TGltaXQ6IDEwMjQwMDAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgYmUgYWJsZSB0byBzdWJzY3JpYmUgdXNlci1wcm92aWRlZCBxdWV1ZSB0byBnaXZlbiB0b3BpY3MnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBjb25zdCB0b3BpY1N1YnNjcmlwdGlvbjEgPSBuZXcgVG9waWNTdWJzY3JpcHRpb24oe1xuICAgICAgdG9waWM6IG5ldyBzbnMuVG9waWMoc3RhY2ssICd0b3BpYzEnKSxcbiAgICAgIHRvcGljU3Vic2NyaXB0aW9uUXVldWU6IHtcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUoc3RhY2ssICdteVF1ZXVlJyksXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGNvbnN0IHRvcGljU3Vic2NyaXB0aW9uMiA9IG5ldyBUb3BpY1N1YnNjcmlwdGlvbih7XG4gICAgICB0b3BpYzogbmV3IHNucy5Ub3BpYyhzdGFjaywgJ3RvcGljMicpLFxuICAgIH0pO1xuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IFF1ZXVlRXh0ZW5zaW9uKHtcbiAgICAgIHN1YnNjcmlwdGlvbnM6IFt0b3BpY1N1YnNjcmlwdGlvbjEsIHRvcGljU3Vic2NyaXB0aW9uMl0sXG4gICAgICBldmVudHNRdWV1ZTogbmV3IHNxcy5RdWV1ZShzdGFjaywgJ2RlZlF1ZXVlJyksXG4gICAgfSkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgLy8gRW5zdXJlIHF1ZXVlIHBvbGljeSBhbGxvd3MgU05TIFRvcGljcyB0byBzZW5kIG1lc3NhZ2UgdG8gdGhlIHF1ZXVlXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U1FTOjpRdWV1ZVBvbGljeScsIHtcbiAgICAgIFBvbGljeURvY3VtZW50OiB7XG4gICAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIEFjdGlvbjogJ3NxczpTZW5kTWVzc2FnZScsXG4gICAgICAgICAgICBDb25kaXRpb246IHtcbiAgICAgICAgICAgICAgQXJuRXF1YWxzOiB7XG4gICAgICAgICAgICAgICAgJ2F3czpTb3VyY2VBcm4nOiB7XG4gICAgICAgICAgICAgICAgICBSZWY6ICd0b3BpYzE1MkQ4NEEzNycsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICBQcmluY2lwYWw6IHtcbiAgICAgICAgICAgICAgU2VydmljZTogJ3Nucy5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBSZXNvdXJjZToge1xuICAgICAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgICAgICAnbXlRdWV1ZTRGREZGNzFDJyxcbiAgICAgICAgICAgICAgICAnQXJuJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgVmVyc2lvbjogJzIwMTItMTAtMTcnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlNRUzo6UXVldWVQb2xpY3knLCB7XG4gICAgICBQb2xpY3lEb2N1bWVudDoge1xuICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBBY3Rpb246ICdzcXM6U2VuZE1lc3NhZ2UnLFxuICAgICAgICAgICAgQ29uZGl0aW9uOiB7XG4gICAgICAgICAgICAgIEFybkVxdWFsczoge1xuICAgICAgICAgICAgICAgICdhd3M6U291cmNlQXJuJzoge1xuICAgICAgICAgICAgICAgICAgUmVmOiAndG9waWMyQTRGQjU0N0YnLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxuICAgICAgICAgICAgUHJpbmNpcGFsOiB7XG4gICAgICAgICAgICAgIFNlcnZpY2U6ICdzbnMuYW1hem9uYXdzLmNvbScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgUmVzb3VyY2U6IHtcbiAgICAgICAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgICAgICAgJ2RlZlF1ZXVlMUY5MUE2NUInLFxuICAgICAgICAgICAgICAgICdBcm4nLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBWZXJzaW9uOiAnMjAxMi0xMC0xNycsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gRW5zdXJlIHRoZSB0YXNrIHJvbGUgaXMgZ2l2ZW4gcGVybWlzc2lvbnMgdG8gY29uc3VtZSBtZXNzYWdlcyBmcm9tIHRoZSBxdWV1ZVxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xuICAgICAgUG9saWN5RG9jdW1lbnQ6IHtcbiAgICAgICAgU3RhdGVtZW50OiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgQWN0aW9uOiBbXG4gICAgICAgICAgICAgICdzcXM6UmVjZWl2ZU1lc3NhZ2UnLFxuICAgICAgICAgICAgICAnc3FzOkNoYW5nZU1lc3NhZ2VWaXNpYmlsaXR5JyxcbiAgICAgICAgICAgICAgJ3NxczpHZXRRdWV1ZVVybCcsXG4gICAgICAgICAgICAgICdzcXM6RGVsZXRlTWVzc2FnZScsXG4gICAgICAgICAgICAgICdzcXM6R2V0UXVldWVBdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICBSZXNvdXJjZToge1xuICAgICAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgICAgICAnZGVmUXVldWUxRjkxQTY1QicsXG4gICAgICAgICAgICAgICAgJ0FybicsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgQWN0aW9uOiBbXG4gICAgICAgICAgICAgICdzcXM6UmVjZWl2ZU1lc3NhZ2UnLFxuICAgICAgICAgICAgICAnc3FzOkNoYW5nZU1lc3NhZ2VWaXNpYmlsaXR5JyxcbiAgICAgICAgICAgICAgJ3NxczpHZXRRdWV1ZVVybCcsXG4gICAgICAgICAgICAgICdzcXM6RGVsZXRlTWVzc2FnZScsXG4gICAgICAgICAgICAgICdzcXM6R2V0UXVldWVBdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBFZmZlY3Q6ICdBbGxvdycsXG4gICAgICAgICAgICBSZXNvdXJjZToge1xuICAgICAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgICAgICAnbXlRdWV1ZTRGREZGNzFDJyxcbiAgICAgICAgICAgICAgICAnQXJuJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgVmVyc2lvbjogJzIwMTItMTAtMTcnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEVuc3VyZSBTTlMgU3Vic2NyaXB0aW9ucyBmb3IgZ2l2ZW4gdG9waWNzXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U05TOjpTdWJzY3JpcHRpb24nLCB7XG4gICAgICBQcm90b2NvbDogJ3NxcycsXG4gICAgICBUb3BpY0Fybjoge1xuICAgICAgICBSZWY6ICd0b3BpYzE1MkQ4NEEzNycsXG4gICAgICB9LFxuICAgICAgRW5kcG9pbnQ6IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ215UXVldWU0RkRGRjcxQycsXG4gICAgICAgICAgJ0FybicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U05TOjpTdWJzY3JpcHRpb24nLCB7XG4gICAgICBQcm90b2NvbDogJ3NxcycsXG4gICAgICBUb3BpY0Fybjoge1xuICAgICAgICBSZWY6ICd0b3BpYzJBNEZCNTQ3RicsXG4gICAgICB9LFxuICAgICAgRW5kcG9pbnQ6IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ2RlZlF1ZXVlMUY5MUE2NUInLFxuICAgICAgICAgICdBcm4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBxdWV1ZSBVUkwgaGFzIGJlZW4gY29ycmVjdGx5IGFkZGVkIHRvIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIENwdTogMjU2LFxuICAgICAgICAgIEVudmlyb25tZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6ICdNWS1TRVJWSUNFX1FVRVVFX1VSSScsXG4gICAgICAgICAgICAgIFZhbHVlOiB7XG4gICAgICAgICAgICAgICAgUmVmOiAnZGVmUXVldWUxRjkxQTY1QicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgSW1hZ2U6ICduYXRoYW5wZWNrL25hbWUnLFxuICAgICAgICAgIEVzc2VudGlhbDogdHJ1ZSxcbiAgICAgICAgICBNZW1vcnk6IDUxMixcbiAgICAgICAgICBOYW1lOiAnYXBwJyxcbiAgICAgICAgICBQb3J0TWFwcGluZ3M6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgQ29udGFpbmVyUG9ydDogODAsXG4gICAgICAgICAgICAgIFByb3RvY29sOiAndGNwJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBVbGltaXRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEhhcmRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgICAgTmFtZTogJ25vZmlsZScsXG4gICAgICAgICAgICAgIFNvZnRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBlcnJvciB3aGVuIHByb3ZpZGluZyBib3RoIHRoZSBzdWJzY3JpcHRpb25RdWV1ZSBhbmQgcXVldWUgKGRlcHJlY2F0ZWQpIHByb3BzIGZvciBhIHRvcGljIHN1YnNjcmlwdGlvbicsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgbmV3IFRvcGljU3Vic2NyaXB0aW9uKHtcbiAgICAgICAgdG9waWM6IG5ldyBzbnMuVG9waWMoc3RhY2ssICd0b3BpYzEnKSxcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUoc3RhY2ssICdkZWxldGUtcXVldWUnKSxcbiAgICAgICAgdG9waWNTdWJzY3JpcHRpb25RdWV1ZToge1xuICAgICAgICAgIHF1ZXVlOiBuZXcgc3FzLlF1ZXVlKHN0YWNrLCAnc2lnbi11cC1xdWV1ZScpLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSkudG9UaHJvdygnRWl0aGVyIHByb3ZpZGUgdGhlIGBzdWJzY3JpcHRpb25RdWV1ZWAgb3IgdGhlIGBxdWV1ZWAgKGRlcHJlY2F0ZWQpIGZvciB0aGUgdG9waWMgc3Vic2NyaXB0aW9uLCBidXQgbm90IGJvdGguJyk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBiZSBhYmxlIHRvIGFkZCB0YXJnZXQgdHJhY2tpbmcgc2NhbGluZyBwb2xpY3kgZm9yIHRoZSBFdmVudHMgUXVldWUgd2l0aCBubyBzdWJzY3JpcHRpb25zJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgUXVldWVFeHRlbnNpb24oe1xuICAgICAgc2NhbGVPbkxhdGVuY3k6IHtcbiAgICAgICAgYWNjZXB0YWJsZUxhdGVuY3k6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICBtZXNzYWdlUHJvY2Vzc2luZ1RpbWU6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDIwKSxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgICBhdXRvU2NhbGVUYXNrQ291bnQ6IHtcbiAgICAgICAgbWF4VGFza0NvdW50OiAxMCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLCB7XG4gICAgICBNYXhDYXBhY2l0eTogMTAsXG4gICAgICBNaW5DYXBhY2l0eTogMSxcbiAgICB9KTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knLCB7XG4gICAgICBQb2xpY3lUeXBlOiAnVGFyZ2V0VHJhY2tpbmdTY2FsaW5nJyxcbiAgICAgIFRhcmdldFRyYWNraW5nU2NhbGluZ1BvbGljeUNvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgQ3VzdG9taXplZE1ldHJpY1NwZWNpZmljYXRpb246IHtcbiAgICAgICAgICBEaW1lbnNpb25zOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6ICdRdWV1ZU5hbWUnLFxuICAgICAgICAgICAgICBWYWx1ZToge1xuICAgICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICAgICAgJ0V2ZW50c1F1ZXVlQjk2RUIwRDInLFxuICAgICAgICAgICAgICAgICAgJ1F1ZXVlTmFtZScsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBNZXRyaWNOYW1lOiAnQmFja2xvZ1BlclRhc2snLFxuICAgICAgICAgIE5hbWVzcGFjZTogJ3Byb2R1Y3Rpb24tbXktc2VydmljZScsXG4gICAgICAgICAgU3RhdGlzdGljOiAnQXZlcmFnZScsXG4gICAgICAgICAgVW5pdDogJ0NvdW50JyxcbiAgICAgICAgfSxcbiAgICAgICAgVGFyZ2V0VmFsdWU6IDE1LFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gYWRkIHRhcmdldCB0cmFja2luZyBzY2FsaW5nIHBvbGljeSBmb3IgdGhlIFNRUyBRdWV1ZXMnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBjb25zdCB0b3BpY1N1YnNjcmlwdGlvbjEgPSBuZXcgVG9waWNTdWJzY3JpcHRpb24oe1xuICAgICAgdG9waWM6IG5ldyBzbnMuVG9waWMoc3RhY2ssICd0b3BpYzEnKSxcbiAgICAgIHRvcGljU3Vic2NyaXB0aW9uUXVldWU6IHtcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUoc3RhY2ssICdteVF1ZXVlJyksXG4gICAgICAgIHNjYWxlT25MYXRlbmN5OiB7XG4gICAgICAgICAgYWNjZXB0YWJsZUxhdGVuY3k6IGNkay5EdXJhdGlvbi5taW51dGVzKDEwKSxcbiAgICAgICAgICBtZXNzYWdlUHJvY2Vzc2luZ1RpbWU6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDIwKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgY29uc3QgdG9waWNTdWJzY3JpcHRpb24yID0gbmV3IFRvcGljU3Vic2NyaXB0aW9uKHtcbiAgICAgIHRvcGljOiBuZXcgc25zLlRvcGljKHN0YWNrLCAndG9waWMyJyksXG4gICAgICBxdWV1ZTogbmV3IHNxcy5RdWV1ZShzdGFjaywgJ3RlbXBRdWV1ZScpLFxuICAgIH0pO1xuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IFF1ZXVlRXh0ZW5zaW9uKHtcbiAgICAgIHN1YnNjcmlwdGlvbnM6IFt0b3BpY1N1YnNjcmlwdGlvbjEsIHRvcGljU3Vic2NyaXB0aW9uMl0sXG4gICAgICBldmVudHNRdWV1ZTogbmV3IHNxcy5RdWV1ZShzdGFjaywgJ2RlZlF1ZXVlJyksXG4gICAgICBzY2FsZU9uTGF0ZW5jeToge1xuICAgICAgICBhY2NlcHRhYmxlTGF0ZW5jeTogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIG1lc3NhZ2VQcm9jZXNzaW5nVGltZTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMjApLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICAgIGF1dG9TY2FsZVRhc2tDb3VudDoge1xuICAgICAgICBtYXhUYXNrQ291bnQ6IDEwLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcsIHtcbiAgICAgIE1heENhcGFjaXR5OiAxMCxcbiAgICAgIE1pbkNhcGFjaXR5OiAxLFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsIHtcbiAgICAgIFBvbGljeVR5cGU6ICdUYXJnZXRUcmFja2luZ1NjYWxpbmcnLFxuICAgICAgVGFyZ2V0VHJhY2tpbmdTY2FsaW5nUG9saWN5Q29uZmlndXJhdGlvbjoge1xuICAgICAgICBDdXN0b21pemVkTWV0cmljU3BlY2lmaWNhdGlvbjoge1xuICAgICAgICAgIERpbWVuc2lvbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ1F1ZXVlTmFtZScsXG4gICAgICAgICAgICAgIFZhbHVlOiB7XG4gICAgICAgICAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgICAgICAgICAnZGVmUXVldWUxRjkxQTY1QicsXG4gICAgICAgICAgICAgICAgICAnUXVldWVOYW1lJyxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIE1ldHJpY05hbWU6ICdCYWNrbG9nUGVyVGFzaycsXG4gICAgICAgICAgTmFtZXNwYWNlOiAncHJvZHVjdGlvbi1teS1zZXJ2aWNlJyxcbiAgICAgICAgICBTdGF0aXN0aWM6ICdBdmVyYWdlJyxcbiAgICAgICAgICBVbml0OiAnQ291bnQnLFxuICAgICAgICB9LFxuICAgICAgICBUYXJnZXRWYWx1ZTogMTUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsIHtcbiAgICAgIFBvbGljeVR5cGU6ICdUYXJnZXRUcmFja2luZ1NjYWxpbmcnLFxuICAgICAgVGFyZ2V0VHJhY2tpbmdTY2FsaW5nUG9saWN5Q29uZmlndXJhdGlvbjoge1xuICAgICAgICBDdXN0b21pemVkTWV0cmljU3BlY2lmaWNhdGlvbjoge1xuICAgICAgICAgIERpbWVuc2lvbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ1F1ZXVlTmFtZScsXG4gICAgICAgICAgICAgIFZhbHVlOiB7XG4gICAgICAgICAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgICAgICAgICAnbXlRdWV1ZTRGREZGNzFDJyxcbiAgICAgICAgICAgICAgICAgICdRdWV1ZU5hbWUnLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgTWV0cmljTmFtZTogJ0JhY2tsb2dQZXJUYXNrJyxcbiAgICAgICAgICBOYW1lc3BhY2U6ICdwcm9kdWN0aW9uLW15LXNlcnZpY2UnLFxuICAgICAgICAgIFN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxuICAgICAgICAgIFVuaXQ6ICdDb3VudCcsXG4gICAgICAgIH0sXG4gICAgICAgIFRhcmdldFZhbHVlOiAzMCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsaW5nUG9saWN5Jywge1xuICAgICAgUG9saWN5VHlwZTogJ1RhcmdldFRyYWNraW5nU2NhbGluZycsXG4gICAgICBUYXJnZXRUcmFja2luZ1NjYWxpbmdQb2xpY3lDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIEN1c3RvbWl6ZWRNZXRyaWNTcGVjaWZpY2F0aW9uOiB7XG4gICAgICAgICAgRGltZW5zaW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiAnUXVldWVOYW1lJyxcbiAgICAgICAgICAgICAgVmFsdWU6IHtcbiAgICAgICAgICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAgICAgICAgICd0ZW1wUXVldWVFRjk0Njg4MicsXG4gICAgICAgICAgICAgICAgICAnUXVldWVOYW1lJyxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIE1ldHJpY05hbWU6ICdCYWNrbG9nUGVyVGFzaycsXG4gICAgICAgICAgTmFtZXNwYWNlOiAncHJvZHVjdGlvbi1teS1zZXJ2aWNlJyxcbiAgICAgICAgICBTdGF0aXN0aWM6ICdBdmVyYWdlJyxcbiAgICAgICAgICBVbml0OiAnQ291bnQnLFxuICAgICAgICB9LFxuICAgICAgICBUYXJnZXRWYWx1ZTogMTUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgZXJyb3Igd2hlbiBhZGRpbmcgc2NhbGluZyBwb2xpY3kgaWYgc2NhbGluZyB0YXJnZXQgaGFzIG5vdCBiZWVuIGNvbmZpZ3VyZWQnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBjb25zdCB0b3BpY1N1YnNjcmlwdGlvbjEgPSBuZXcgVG9waWNTdWJzY3JpcHRpb24oe1xuICAgICAgdG9waWM6IG5ldyBzbnMuVG9waWMoc3RhY2ssICd0b3BpYzEnKSxcbiAgICB9KTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IFF1ZXVlRXh0ZW5zaW9uKHtcbiAgICAgIHN1YnNjcmlwdGlvbnM6IFt0b3BpY1N1YnNjcmlwdGlvbjFdLFxuICAgICAgc2NhbGVPbkxhdGVuY3k6IHtcbiAgICAgICAgYWNjZXB0YWJsZUxhdGVuY3k6IGNkay5EdXJhdGlvbi5taW51dGVzKDEwKSxcbiAgICAgICAgbWVzc2FnZVByb2Nlc3NpbmdUaW1lOiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgICBlbnZpcm9ubWVudCxcbiAgICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgfSk7XG4gICAgfSkudG9UaHJvdygvQXV0byBzY2FsaW5nIHRhcmdldCBmb3IgdGhlIHNlcnZpY2UgJ215LXNlcnZpY2UnIGhhc24ndCBiZWVuIGNvbmZpZ3VyZWQuIFBsZWFzZSB1c2UgU2VydmljZSBjb25zdHJ1Y3QgdG8gY29uZmlndXJlICdtaW5UYXNrQ291bnQnIGFuZCAnbWF4VGFza0NvdW50Jy4vKTtcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGVycm9yIHdoZW4gbWVzc2FnZSBwcm9jZXNzaW5nIHRpbWUgZm9yIHRoZSBxdWV1ZSBpcyBncmVhdGVyIHRoYW4gYWNjZXB0YWJsZSBsYXRlbmN5JywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuXG4gICAgY29uc3QgdG9waWNTdWJzY3JpcHRpb24xID0gbmV3IFRvcGljU3Vic2NyaXB0aW9uKHtcbiAgICAgIHRvcGljOiBuZXcgc25zLlRvcGljKHN0YWNrLCAndG9waWMxJyksXG4gICAgICB0b3BpY1N1YnNjcmlwdGlvblF1ZXVlOiB7XG4gICAgICAgIHF1ZXVlOiBuZXcgc3FzLlF1ZXVlKHN0YWNrLCAnc2lnbi11cC1xdWV1ZScpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IFF1ZXVlRXh0ZW5zaW9uKHtcbiAgICAgIHN1YnNjcmlwdGlvbnM6IFt0b3BpY1N1YnNjcmlwdGlvbjFdLFxuICAgICAgc2NhbGVPbkxhdGVuY3k6IHtcbiAgICAgICAgYWNjZXB0YWJsZUxhdGVuY3k6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgICAgbWVzc2FnZVByb2Nlc3NpbmdUaW1lOiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgICBlbnZpcm9ubWVudCxcbiAgICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgICBhdXRvU2NhbGVUYXNrQ291bnQ6IHtcbiAgICAgICAgICBtYXhUYXNrQ291bnQ6IDEwLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSkudG9UaHJvdygnTWVzc2FnZSBwcm9jZXNzaW5nIHRpbWUgKDIwcykgZm9yIHRoZSBxdWV1ZSBjYW5ub3QgYmUgZ3JlYXRlciBhY2NlcHRhYmxlIHF1ZXVlIGxhdGVuY3kgKDEwcykuJyk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBlcnJvciB3aGVuIGNvbmZpZ3VyaW5nIGF1dG8gc2NhbGluZyBvbmx5IGZvciB0b3BpYy1zcGVjaWZpYyBxdWV1ZScsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IHRvcGljU3Vic2NyaXB0aW9uMSA9IG5ldyBUb3BpY1N1YnNjcmlwdGlvbih7XG4gICAgICB0b3BpYzogbmV3IHNucy5Ub3BpYyhzdGFjaywgJ3RvcGljMScpLFxuICAgICAgdG9waWNTdWJzY3JpcHRpb25RdWV1ZToge1xuICAgICAgICBxdWV1ZTogbmV3IHNxcy5RdWV1ZShzdGFjaywgJ3NpZ24tdXAtcXVldWUnKSxcbiAgICAgICAgc2NhbGVPbkxhdGVuY3k6IHtcbiAgICAgICAgICBhY2NlcHRhYmxlTGF0ZW5jeTogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTApLFxuICAgICAgICAgIG1lc3NhZ2VQcm9jZXNzaW5nVGltZTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMjApLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IFF1ZXVlRXh0ZW5zaW9uKHtcbiAgICAgIHN1YnNjcmlwdGlvbnM6IFt0b3BpY1N1YnNjcmlwdGlvbjFdLFxuICAgIH0pKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3QoKCkgPT4ge1xuICAgICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgICBlbnZpcm9ubWVudCxcbiAgICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgICBhdXRvU2NhbGVUYXNrQ291bnQ6IHtcbiAgICAgICAgICBtYXhUYXNrQ291bnQ6IDEwLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSkudG9UaHJvdygvQXV0b3NjYWxpbmcgZm9yIGEgdG9waWMtc3BlY2lmaWMgcXVldWUgY2Fubm90IGJlIGNvbmZpZ3VyZWQgYXMgYXV0b3NjYWxpbmcgYmFzZWQgb24gU1FTIFF1ZXVlcyBoYXNu4oCZdCBiZWVuIHNldCB1cCBmb3IgdGhlIHNlcnZpY2UgJ215LXNlcnZpY2UnLiBJZiB5b3Ugd2FudCB0byBlbmFibGUgYXV0b3NjYWxpbmcgZm9yIHRoaXMgc2VydmljZSwgcGxlYXNlIGFsc28gc3BlY2lmeSAnc2NhbGVPbkxhdGVuY3knIGluIHRoZSAnUXVldWVFeHRlbnNpb24nLyk7XG4gIH0pO1xufSk7Il19