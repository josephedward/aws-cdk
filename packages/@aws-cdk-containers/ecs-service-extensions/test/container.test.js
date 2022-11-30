"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const autoscaling = require("@aws-cdk/aws-autoscaling");
const ec2 = require("@aws-cdk/aws-ec2");
const ecs = require("@aws-cdk/aws-ecs");
const iam = require("@aws-cdk/aws-iam");
const awslogs = require("@aws-cdk/aws-logs");
const cdk = require("@aws-cdk/core");
const cxapi = require("@aws-cdk/cx-api");
const lib_1 = require("../lib");
describe('container', () => {
    test('should be able to add a container to the service', () => {
        // GIVEN
        const stack = new cdk.Stack();
        const vpc = new ec2.Vpc(stack, 'VPC');
        const cluster = new ecs.Cluster(stack, 'Cluster', { vpc });
        cluster.addAsgCapacityProvider(new ecs.AsgCapacityProvider(stack, 'Provider', {
            autoScalingGroup: new autoscaling.AutoScalingGroup(stack, 'DefaultAutoScalingGroup', {
                vpc,
                machineImage: ec2.MachineImage.latestAmazonLinux(),
                instanceType: new ec2.InstanceType('t2.micro'),
            }),
        }));
        const environment = new lib_1.Environment(stack, 'production', {
            vpc,
            cluster,
            capacityType: lib_1.EnvironmentCapacityType.EC2,
        });
        const serviceDescription = new lib_1.ServiceDescription();
        const taskRole = new iam.Role(stack, 'CustomTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            taskRole,
        });
        // THEN
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::ECS::Service', 1);
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    Essential: true,
                    Image: 'nathanpeck/name',
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
            Cpu: '256',
            Family: 'myservicetaskdefinition',
            Memory: '512',
            NetworkMode: 'awsvpc',
            RequiresCompatibilities: [
                'EC2',
                'FARGATE',
            ],
            TaskRoleArn: {
                'Fn::GetAtt': [
                    'CustomTaskRole3C6B13FD',
                    'Arn',
                ],
            },
        });
    });
    test('should be able to enable default logging behavior - with enable default log driver feature flag', () => {
        // GIVEN
        const stack = new cdk.Stack();
        stack.node.setContext(cxapi.ECS_SERVICE_EXTENSIONS_ENABLE_DEFAULT_LOG_DRIVER, true);
        const vpc = new ec2.Vpc(stack, 'VPC');
        const cluster = new ecs.Cluster(stack, 'Cluster', { vpc });
        cluster.addAsgCapacityProvider(new ecs.AsgCapacityProvider(stack, 'Provider', {
            autoScalingGroup: new autoscaling.AutoScalingGroup(stack, 'DefaultAutoScalingGroup', {
                vpc,
                machineImage: ec2.MachineImage.latestAmazonLinux(),
                instanceType: new ec2.InstanceType('t2.micro'),
            }),
        }));
        const environment = new lib_1.Environment(stack, 'production', {
            vpc,
            cluster,
            capacityType: lib_1.EnvironmentCapacityType.EC2,
        });
        const serviceDescription = new lib_1.ServiceDescription();
        const taskRole = new iam.Role(stack, 'CustomTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            taskRole,
        });
        // THEN
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::ECS::Service', 1);
        // Ensure that the log group was created
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::Logs::LogGroup', 1);
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    Essential: true,
                    Image: 'nathanpeck/name',
                    LogConfiguration: {
                        LogDriver: 'awslogs',
                        Options: {
                            'awslogs-group': {
                                Ref: 'myservicelogs176EE19F',
                            },
                            'awslogs-stream-prefix': 'my-service',
                            'awslogs-region': {
                                Ref: 'AWS::Region',
                            },
                        },
                    },
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
            Cpu: '256',
            Family: 'myservicetaskdefinition',
            Memory: '512',
            NetworkMode: 'awsvpc',
            RequiresCompatibilities: [
                'EC2',
                'FARGATE',
            ],
            TaskRoleArn: {
                'Fn::GetAtt': [
                    'CustomTaskRole3C6B13FD',
                    'Arn',
                ],
            },
        });
    });
    test('should be able to add user-provided log group in the log driver options', () => {
        // GIVEN
        const stack = new cdk.Stack();
        stack.node.setContext(cxapi.ECS_SERVICE_EXTENSIONS_ENABLE_DEFAULT_LOG_DRIVER, true);
        const vpc = new ec2.Vpc(stack, 'VPC');
        const cluster = new ecs.Cluster(stack, 'Cluster', { vpc });
        cluster.addAsgCapacityProvider(new ecs.AsgCapacityProvider(stack, 'Provider', {
            autoScalingGroup: new autoscaling.AutoScalingGroup(stack, 'DefaultAutoScalingGroup', {
                vpc,
                machineImage: ec2.MachineImage.latestAmazonLinux(),
                instanceType: new ec2.InstanceType('t2.micro'),
            }),
        }));
        const environment = new lib_1.Environment(stack, 'production', {
            vpc,
            cluster,
            capacityType: lib_1.EnvironmentCapacityType.EC2,
        });
        const serviceDescription = new lib_1.ServiceDescription();
        const taskRole = new iam.Role(stack, 'CustomTaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        serviceDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
            logGroup: new awslogs.LogGroup(stack, 'MyLogGroup'),
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            taskRole,
        });
        // THEN
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::ECS::Service', 1);
        // Ensure that the log group was created
        assertions_1.Template.fromStack(stack).resourceCountIs('AWS::Logs::LogGroup', 1);
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    Essential: true,
                    Image: 'nathanpeck/name',
                    LogConfiguration: {
                        LogDriver: 'awslogs',
                        Options: {
                            'awslogs-group': {
                                Ref: 'MyLogGroup5C0DAD85',
                            },
                            'awslogs-stream-prefix': 'my-service',
                            'awslogs-region': {
                                Ref: 'AWS::Region',
                            },
                        },
                    },
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
            Cpu: '256',
            Family: 'myservicetaskdefinition',
            Memory: '512',
            NetworkMode: 'awsvpc',
            RequiresCompatibilities: [
                'EC2',
                'FARGATE',
            ],
            TaskRoleArn: {
                'Fn::GetAtt': [
                    'CustomTaskRole3C6B13FD',
                    'Arn',
                ],
            },
        });
    });
    test('should error when log group is provided in the container extension and another observability extension is added', () => {
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
            logGroup: new awslogs.LogGroup(stack, 'MyLogGroup'),
        }));
        serviceDescription.add(new lib_1.FireLensExtension());
        // THEN
        expect(() => {
            new lib_1.Service(stack, 'my-service', {
                environment,
                serviceDescription,
            });
        }).toThrow(/Log configuration already specified. You cannot provide a log group for the application container of service 'my-service' while also adding log configuration separately using service extensions./);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGFpbmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb250YWluZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG9EQUErQztBQUMvQyx3REFBd0Q7QUFDeEQsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUN4Qyx3Q0FBd0M7QUFDeEMsNkNBQTZDO0FBQzdDLHFDQUFxQztBQUNyQyx5Q0FBeUM7QUFDekMsZ0NBQXlIO0FBRXpILFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7UUFDNUQsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFO1lBQzVFLGdCQUFnQixFQUFFLElBQUksV0FBVyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSx5QkFBeUIsRUFBRTtnQkFDbkYsR0FBRztnQkFDSCxZQUFZLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDbEQsWUFBWSxFQUFFLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7YUFDL0MsQ0FBQztTQUNILENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxXQUFXLEdBQUcsSUFBSSxpQkFBVyxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUU7WUFDdkQsR0FBRztZQUNILE9BQU87WUFDUCxZQUFZLEVB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QUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUZW1wbGF0ZSB9IGZyb20gJ0Bhd3MtY2RrL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgYXV0b3NjYWxpbmcgZnJvbSAnQGF3cy1jZGsvYXdzLWF1dG9zY2FsaW5nJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdAYXdzLWNkay9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdAYXdzLWNkay9hd3MtZWNzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGF3c2xvZ3MgZnJvbSAnQGF3cy1jZGsvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0ICogYXMgY3hhcGkgZnJvbSAnQGF3cy1jZGsvY3gtYXBpJztcbmltcG9ydCB7IENvbnRhaW5lciwgRW52aXJvbm1lbnQsIEVudmlyb25tZW50Q2FwYWNpdHlUeXBlLCBGaXJlTGVuc0V4dGVuc2lvbiwgU2VydmljZSwgU2VydmljZURlc2NyaXB0aW9uIH0gZnJvbSAnLi4vbGliJztcblxuZGVzY3JpYmUoJ2NvbnRhaW5lcicsICgpID0+IHtcbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gYWRkIGEgY29udGFpbmVyIHRvIHRoZSBzZXJ2aWNlJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG4gICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGMoc3RhY2ssICdWUEMnKTtcbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHN0YWNrLCAnQ2x1c3RlcicsIHsgdnBjIH0pO1xuICAgIGNsdXN0ZXIuYWRkQXNnQ2FwYWNpdHlQcm92aWRlcihuZXcgZWNzLkFzZ0NhcGFjaXR5UHJvdmlkZXIoc3RhY2ssICdQcm92aWRlcicsIHtcbiAgICAgIGF1dG9TY2FsaW5nR3JvdXA6IG5ldyBhdXRvc2NhbGluZy5BdXRvU2NhbGluZ0dyb3VwKHN0YWNrLCAnRGVmYXVsdEF1dG9TY2FsaW5nR3JvdXAnLCB7XG4gICAgICAgIHZwYyxcbiAgICAgICAgbWFjaGluZUltYWdlOiBlYzIuTWFjaGluZUltYWdlLmxhdGVzdEFtYXpvbkxpbnV4KCksXG4gICAgICAgIGluc3RhbmNlVHlwZTogbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ3QyLm1pY3JvJyksXG4gICAgICB9KSxcbiAgICB9KSk7XG5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nLCB7XG4gICAgICB2cGMsXG4gICAgICBjbHVzdGVyLFxuICAgICAgY2FwYWNpdHlUeXBlOiBFbnZpcm9ubWVudENhcGFjaXR5VHlwZS5FQzIsXG4gICAgfSk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuICAgIGNvbnN0IHRhc2tSb2xlID0gbmV3IGlhbS5Sb2xlKHN0YWNrLCAnQ3VzdG9tVGFza1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICB9KTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgdGFza1JvbGUsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywgMSk7XG5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIENwdTogMjU2LFxuICAgICAgICAgIEVzc2VudGlhbDogdHJ1ZSxcbiAgICAgICAgICBJbWFnZTogJ25hdGhhbnBlY2svbmFtZScsXG4gICAgICAgICAgTWVtb3J5OiA1MTIsXG4gICAgICAgICAgTmFtZTogJ2FwcCcsXG4gICAgICAgICAgUG9ydE1hcHBpbmdzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIENvbnRhaW5lclBvcnQ6IDgwLFxuICAgICAgICAgICAgICBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgVWxpbWl0czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBIYXJkTGltaXQ6IDEwMjQwMDAsXG4gICAgICAgICAgICAgIE5hbWU6ICdub2ZpbGUnLFxuICAgICAgICAgICAgICBTb2Z0TGltaXQ6IDEwMjQwMDAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgQ3B1OiAnMjU2JyxcbiAgICAgIEZhbWlseTogJ215c2VydmljZXRhc2tkZWZpbml0aW9uJyxcbiAgICAgIE1lbW9yeTogJzUxMicsXG4gICAgICBOZXR3b3JrTW9kZTogJ2F3c3ZwYycsXG4gICAgICBSZXF1aXJlc0NvbXBhdGliaWxpdGllczogW1xuICAgICAgICAnRUMyJyxcbiAgICAgICAgJ0ZBUkdBVEUnLFxuICAgICAgXSxcbiAgICAgIFRhc2tSb2xlQXJuOiB7XG4gICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICdDdXN0b21UYXNrUm9sZTNDNkIxM0ZEJyxcbiAgICAgICAgICAnQXJuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBiZSBhYmxlIHRvIGVuYWJsZSBkZWZhdWx0IGxvZ2dpbmcgYmVoYXZpb3IgLSB3aXRoIGVuYWJsZSBkZWZhdWx0IGxvZyBkcml2ZXIgZmVhdHVyZSBmbGFnJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG4gICAgc3RhY2subm9kZS5zZXRDb250ZXh0KGN4YXBpLkVDU19TRVJWSUNFX0VYVEVOU0lPTlNfRU5BQkxFX0RFRkFVTFRfTE9HX0RSSVZFUiwgdHJ1ZSk7XG5cbiAgICBjb25zdCB2cGMgPSBuZXcgZWMyLlZwYyhzdGFjaywgJ1ZQQycpO1xuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIoc3RhY2ssICdDbHVzdGVyJywgeyB2cGMgfSk7XG4gICAgY2x1c3Rlci5hZGRBc2dDYXBhY2l0eVByb3ZpZGVyKG5ldyBlY3MuQXNnQ2FwYWNpdHlQcm92aWRlcihzdGFjaywgJ1Byb3ZpZGVyJywge1xuICAgICAgYXV0b1NjYWxpbmdHcm91cDogbmV3IGF1dG9zY2FsaW5nLkF1dG9TY2FsaW5nR3JvdXAoc3RhY2ssICdEZWZhdWx0QXV0b1NjYWxpbmdHcm91cCcsIHtcbiAgICAgICAgdnBjLFxuICAgICAgICBtYWNoaW5lSW1hZ2U6IGVjMi5NYWNoaW5lSW1hZ2UubGF0ZXN0QW1hem9uTGludXgoKSxcbiAgICAgICAgaW5zdGFuY2VUeXBlOiBuZXcgZWMyLkluc3RhbmNlVHlwZSgndDIubWljcm8nKSxcbiAgICAgIH0pLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicsIHtcbiAgICAgIHZwYyxcbiAgICAgIGNsdXN0ZXIsXG4gICAgICBjYXBhY2l0eVR5cGU6IEVudmlyb25tZW50Q2FwYWNpdHlUeXBlLkVDMixcbiAgICB9KTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG4gICAgY29uc3QgdGFza1JvbGUgPSBuZXcgaWFtLlJvbGUoc3RhY2ssICdDdXN0b21UYXNrUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgIH0pO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgICB0YXNrUm9sZSxcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLnJlc291cmNlQ291bnRJcygnQVdTOjpFQ1M6OlNlcnZpY2UnLCAxKTtcblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBsb2cgZ3JvdXAgd2FzIGNyZWF0ZWRcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLnJlc291cmNlQ291bnRJcygnQVdTOjpMb2dzOjpMb2dHcm91cCcsIDEpO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgIENvbnRhaW5lckRlZmluaXRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBDcHU6IDI1NixcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgSW1hZ2U6ICduYXRoYW5wZWNrL25hbWUnLFxuICAgICAgICAgIExvZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIExvZ0RyaXZlcjogJ2F3c2xvZ3MnLFxuICAgICAgICAgICAgT3B0aW9uczoge1xuICAgICAgICAgICAgICAnYXdzbG9ncy1ncm91cCc6IHtcbiAgICAgICAgICAgICAgICBSZWY6ICdteXNlcnZpY2Vsb2dzMTc2RUUxOUYnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAnYXdzbG9ncy1zdHJlYW0tcHJlZml4JzogJ215LXNlcnZpY2UnLFxuICAgICAgICAgICAgICAnYXdzbG9ncy1yZWdpb24nOiB7XG4gICAgICAgICAgICAgICAgUmVmOiAnQVdTOjpSZWdpb24nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIE1lbW9yeTogNTEyLFxuICAgICAgICAgIE5hbWU6ICdhcHAnLFxuICAgICAgICAgIFBvcnRNYXBwaW5nczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb250YWluZXJQb3J0OiA4MCxcbiAgICAgICAgICAgICAgUHJvdG9jb2w6ICd0Y3AnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFVsaW1pdHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgSGFyZExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgICBOYW1lOiAnbm9maWxlJyxcbiAgICAgICAgICAgICAgU29mdExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIENwdTogJzI1NicsXG4gICAgICBGYW1pbHk6ICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvbicsXG4gICAgICBNZW1vcnk6ICc1MTInLFxuICAgICAgTmV0d29ya01vZGU6ICdhd3N2cGMnLFxuICAgICAgUmVxdWlyZXNDb21wYXRpYmlsaXRpZXM6IFtcbiAgICAgICAgJ0VDMicsXG4gICAgICAgICdGQVJHQVRFJyxcbiAgICAgIF0sXG4gICAgICBUYXNrUm9sZUFybjoge1xuICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAnQ3VzdG9tVGFza1JvbGUzQzZCMTNGRCcsXG4gICAgICAgICAgJ0FybicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgYmUgYWJsZSB0byBhZGQgdXNlci1wcm92aWRlZCBsb2cgZ3JvdXAgaW4gdGhlIGxvZyBkcml2ZXIgb3B0aW9ucycsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuICAgIHN0YWNrLm5vZGUuc2V0Q29udGV4dChjeGFwaS5FQ1NfU0VSVklDRV9FWFRFTlNJT05TX0VOQUJMRV9ERUZBVUxUX0xPR19EUklWRVIsIHRydWUpO1xuXG4gICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGMoc3RhY2ssICdWUEMnKTtcbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHN0YWNrLCAnQ2x1c3RlcicsIHsgdnBjIH0pO1xuICAgIGNsdXN0ZXIuYWRkQXNnQ2FwYWNpdHlQcm92aWRlcihuZXcgZWNzLkFzZ0NhcGFjaXR5UHJvdmlkZXIoc3RhY2ssICdQcm92aWRlcicsIHtcbiAgICAgIGF1dG9TY2FsaW5nR3JvdXA6IG5ldyBhdXRvc2NhbGluZy5BdXRvU2NhbGluZ0dyb3VwKHN0YWNrLCAnRGVmYXVsdEF1dG9TY2FsaW5nR3JvdXAnLCB7XG4gICAgICAgIHZwYyxcbiAgICAgICAgbWFjaGluZUltYWdlOiBlYzIuTWFjaGluZUltYWdlLmxhdGVzdEFtYXpvbkxpbnV4KCksXG4gICAgICAgIGluc3RhbmNlVHlwZTogbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ3QyLm1pY3JvJyksXG4gICAgICB9KSxcbiAgICB9KSk7XG5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nLCB7XG4gICAgICB2cGMsXG4gICAgICBjbHVzdGVyLFxuICAgICAgY2FwYWNpdHlUeXBlOiBFbnZpcm9ubWVudENhcGFjaXR5VHlwZS5FQzIsXG4gICAgfSk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuICAgIGNvbnN0IHRhc2tSb2xlID0gbmV3IGlhbS5Sb2xlKHN0YWNrLCAnQ3VzdG9tVGFza1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICB9KTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgICAgbG9nR3JvdXA6IG5ldyBhd3Nsb2dzLkxvZ0dyb3VwKHN0YWNrLCAnTXlMb2dHcm91cCcpLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgdGFza1JvbGUsXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywgMSk7XG5cbiAgICAvLyBFbnN1cmUgdGhhdCB0aGUgbG9nIGdyb3VwIHdhcyBjcmVhdGVkXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCAxKTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCB7XG4gICAgICBDb250YWluZXJEZWZpbml0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgQ3B1OiAyNTYsXG4gICAgICAgICAgRXNzZW50aWFsOiB0cnVlLFxuICAgICAgICAgIEltYWdlOiAnbmF0aGFucGVjay9uYW1lJyxcbiAgICAgICAgICBMb2dDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICBMb2dEcml2ZXI6ICdhd3Nsb2dzJyxcbiAgICAgICAgICAgIE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgJ2F3c2xvZ3MtZ3JvdXAnOiB7XG4gICAgICAgICAgICAgICAgUmVmOiAnTXlMb2dHcm91cDVDMERBRDg1JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgJ2F3c2xvZ3Mtc3RyZWFtLXByZWZpeCc6ICdteS1zZXJ2aWNlJyxcbiAgICAgICAgICAgICAgJ2F3c2xvZ3MtcmVnaW9uJzoge1xuICAgICAgICAgICAgICAgIFJlZjogJ0FXUzo6UmVnaW9uJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBNZW1vcnk6IDUxMixcbiAgICAgICAgICBOYW1lOiAnYXBwJyxcbiAgICAgICAgICBQb3J0TWFwcGluZ3M6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgQ29udGFpbmVyUG9ydDogODAsXG4gICAgICAgICAgICAgIFByb3RvY29sOiAndGNwJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBVbGltaXRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEhhcmRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgICAgTmFtZTogJ25vZmlsZScsXG4gICAgICAgICAgICAgIFNvZnRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBDcHU6ICcyNTYnLFxuICAgICAgRmFtaWx5OiAnbXlzZXJ2aWNldGFza2RlZmluaXRpb24nLFxuICAgICAgTWVtb3J5OiAnNTEyJyxcbiAgICAgIE5ldHdvcmtNb2RlOiAnYXdzdnBjJyxcbiAgICAgIFJlcXVpcmVzQ29tcGF0aWJpbGl0aWVzOiBbXG4gICAgICAgICdFQzInLFxuICAgICAgICAnRkFSR0FURScsXG4gICAgICBdLFxuICAgICAgVGFza1JvbGVBcm46IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ0N1c3RvbVRhc2tSb2xlM0M2QjEzRkQnLFxuICAgICAgICAgICdBcm4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGVycm9yIHdoZW4gbG9nIGdyb3VwIGlzIHByb3ZpZGVkIGluIHRoZSBjb250YWluZXIgZXh0ZW5zaW9uIGFuZCBhbm90aGVyIG9ic2VydmFiaWxpdHkgZXh0ZW5zaW9uIGlzIGFkZGVkJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgICBsb2dHcm91cDogbmV3IGF3c2xvZ3MuTG9nR3JvdXAoc3RhY2ssICdNeUxvZ0dyb3VwJyksXG4gICAgfSkpO1xuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IEZpcmVMZW5zRXh0ZW5zaW9uKCkpO1xuXG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdCgoKSA9PiB7XG4gICAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICAgIGVudmlyb25tZW50LFxuICAgICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgICB9KTtcbiAgICB9KS50b1Rocm93KC9Mb2cgY29uZmlndXJhdGlvbiBhbHJlYWR5IHNwZWNpZmllZC4gWW91IGNhbm5vdCBwcm92aWRlIGEgbG9nIGdyb3VwIGZvciB0aGUgYXBwbGljYXRpb24gY29udGFpbmVyIG9mIHNlcnZpY2UgJ215LXNlcnZpY2UnIHdoaWxlIGFsc28gYWRkaW5nIGxvZyBjb25maWd1cmF0aW9uIHNlcGFyYXRlbHkgdXNpbmcgc2VydmljZSBleHRlbnNpb25zLi8pO1xuICB9KTtcbn0pO1xuIl19