"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const appmesh = require("@aws-cdk/aws-appmesh");
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('appmesh', () => {
    test('should be able to add AWS App Mesh to a service', () => {
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
        const mesh = new appmesh.Mesh(stack, 'my-mesh');
        serviceDescription.add(new lib_1.AppMeshExtension({
            mesh,
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        // Ensure that task has an App Mesh sidecar
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    DependsOn: [
                        {
                            Condition: 'HEALTHY',
                            ContainerName: 'envoy',
                        },
                    ],
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
                {
                    Environment: [
                        {
                            Name: 'APPMESH_VIRTUAL_NODE_NAME',
                            Value: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'mesh/',
                                        {
                                            'Fn::GetAtt': [
                                                'mymeshEA67EDEF',
                                                'MeshName',
                                            ],
                                        },
                                        '/virtualNode/my-service',
                                    ],
                                ],
                            },
                        },
                        {
                            Name: 'AWS_REGION',
                            Value: {
                                Ref: 'AWS::Region',
                            },
                        },
                        {
                            Name: 'ENABLE_ENVOY_STATS_TAGS',
                            Value: '1',
                        },
                        {
                            Name: 'ENABLE_ENVOY_DOG_STATSD',
                            Value: '1',
                        },
                    ],
                    Essential: true,
                    HealthCheck: {
                        Command: [
                            'CMD-SHELL',
                            'curl -s http://localhost:9901/server_info | grep state | grep -q LIVE',
                        ],
                        Interval: 5,
                        Retries: 3,
                        StartPeriod: 10,
                        Timeout: 2,
                    },
                    Image: {
                        'Fn::Join': [
                            '',
                            [
                                {
                                    'Fn::FindInMap': [
                                        'myserviceenvoyimageaccountmapping',
                                        {
                                            Ref: 'AWS::Region',
                                        },
                                        'ecrRepo',
                                    ],
                                },
                                '.dkr.ecr.',
                                {
                                    Ref: 'AWS::Region',
                                },
                                '.',
                                {
                                    Ref: 'AWS::URLSuffix',
                                },
                                '/aws-appmesh-envoy:v1.15.1.0-prod',
                            ],
                        ],
                    },
                    LogConfiguration: {
                        LogDriver: 'awslogs',
                        Options: {
                            'awslogs-group': {
                                Ref: 'myservicetaskdefinitionenvoyLogGroup0C27EBDB',
                            },
                            'awslogs-stream-prefix': 'envoy',
                            'awslogs-region': {
                                Ref: 'AWS::Region',
                            },
                        },
                    },
                    MemoryReservation: 128,
                    Name: 'envoy',
                    Ulimits: [
                        {
                            HardLimit: 1024000,
                            Name: 'nofile',
                            SoftLimit: 1024000,
                        },
                    ],
                    User: '1337',
                },
            ],
            Cpu: '256',
            ExecutionRoleArn: {
                'Fn::GetAtt': [
                    'myservicetaskdefinitionExecutionRole0CE74AD0',
                    'Arn',
                ],
            },
            Family: 'myservicetaskdefinition',
            Memory: '512',
            NetworkMode: 'awsvpc',
            ProxyConfiguration: {
                ContainerName: 'envoy',
                ProxyConfigurationProperties: [
                    {
                        Name: 'AppPorts',
                        Value: '80',
                    },
                    {
                        Name: 'ProxyEgressPort',
                        Value: '15001',
                    },
                    {
                        Name: 'ProxyIngressPort',
                        Value: '15000',
                    },
                    {
                        Name: 'IgnoredUID',
                        Value: '1337',
                    },
                    {
                        Name: 'IgnoredGID',
                        Value: '1338',
                    },
                    {
                        Name: 'EgressIgnoredIPs',
                        Value: '169.254.170.2,169.254.169.254',
                    },
                ],
                Type: 'APPMESH',
            },
            RequiresCompatibilities: [
                'EC2',
                'FARGATE',
            ],
            TaskRoleArn: {
                'Fn::GetAtt': [
                    'myservicetaskdefinitionTaskRole92ACD903',
                    'Arn',
                ],
            },
        });
        // Ensure that the service has the right settings
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            Cluster: {
                Ref: 'productionenvironmentclusterC6599D2D',
            },
            DeploymentConfiguration: {
                MaximumPercent: 200,
                MinimumHealthyPercent: 100,
            },
            DesiredCount: 1,
            EnableECSManagedTags: false,
            LaunchType: 'FARGATE',
            NetworkConfiguration: {
                AwsvpcConfiguration: {
                    AssignPublicIp: 'DISABLED',
                    SecurityGroups: [
                        {
                            'Fn::GetAtt': [
                                'myserviceserviceSecurityGroup3A44A969',
                                'GroupId',
                            ],
                        },
                    ],
                    Subnets: [
                        {
                            Ref: 'productionenvironmentvpcPrivateSubnet1Subnet53F632E6',
                        },
                        {
                            Ref: 'productionenvironmentvpcPrivateSubnet2Subnet756FB93C',
                        },
                    ],
                },
            },
            ServiceRegistries: [
                {
                    RegistryArn: {
                        'Fn::GetAtt': [
                            'myserviceserviceCloudmapService32F63163',
                            'Arn',
                        ],
                    },
                },
            ],
            TaskDefinition: {
                Ref: 'myservicetaskdefinitionF3E2D86F',
            },
        });
    });
    test('should have the right maximumPercentage at desired count == 1', () => {
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
        const mesh = new appmesh.Mesh(stack, 'my-mesh');
        serviceDescription.add(new lib_1.AppMeshExtension({
            mesh,
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            desiredCount: 1,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DeploymentConfiguration: {
                MaximumPercent: 200,
                MinimumHealthyPercent: 100,
            },
            DesiredCount: 1,
        });
    });
    test('should have the right maximumPercentage at desired count == 2', () => {
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
        const mesh = new appmesh.Mesh(stack, 'my-mesh');
        serviceDescription.add(new lib_1.AppMeshExtension({
            mesh,
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            desiredCount: 2,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DeploymentConfiguration: {
                MaximumPercent: 150,
                MinimumHealthyPercent: 100,
            },
            DesiredCount: 2,
        });
    });
    test('should have the right maximumPercentage at desired count == 3', () => {
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
        const mesh = new appmesh.Mesh(stack, 'my-mesh');
        serviceDescription.add(new lib_1.AppMeshExtension({
            mesh,
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            desiredCount: 3,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DeploymentConfiguration: {
                MaximumPercent: 150,
                MinimumHealthyPercent: 100,
            },
            DesiredCount: 3,
        });
    });
    test('should have the right maximumPercentage at desired count == 4', () => {
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
        const mesh = new appmesh.Mesh(stack, 'my-mesh');
        serviceDescription.add(new lib_1.AppMeshExtension({
            mesh,
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            desiredCount: 4,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DeploymentConfiguration: {
                MaximumPercent: 125,
                MinimumHealthyPercent: 100,
            },
            DesiredCount: 4,
        });
    });
    test('should have the right maximumPercentage at desired count > 4', () => {
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
        const mesh = new appmesh.Mesh(stack, 'my-mesh');
        serviceDescription.add(new lib_1.AppMeshExtension({
            mesh,
        }));
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
            desiredCount: 8,
        });
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::Service', {
            DeploymentConfiguration: {
                MaximumPercent: 125,
                MinimumHealthyPercent: 100,
            },
            DesiredCount: 8,
        });
    });
    test('should be able to create multiple App Mesh enabled services and connect', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const mesh = new appmesh.Mesh(stack, 'my-mesh');
        const environment = new lib_1.Environment(stack, 'production');
        const nameDescription = new lib_1.ServiceDescription();
        nameDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
            environment: {
                PORT: '80',
            },
        }));
        nameDescription.add(new lib_1.AppMeshExtension({ mesh }));
        const greetingDescription = new lib_1.ServiceDescription();
        greetingDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/greeting'),
            environment: {
                PORT: '80',
            },
        }));
        greetingDescription.add(new lib_1.AppMeshExtension({ mesh }));
        const greeterDescription = new lib_1.ServiceDescription();
        greeterDescription.add(new lib_1.Container({
            cpu: 256,
            memoryMiB: 512,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/greeter'),
            environment: {
                PORT: '80',
            },
        }));
        greeterDescription.add(new lib_1.AppMeshExtension({ mesh }));
        const greeterService = new lib_1.Service(stack, 'greeter', {
            environment,
            serviceDescription: greeterDescription,
        });
        const greetingService = new lib_1.Service(stack, 'greeting', {
            environment,
            serviceDescription: greetingDescription,
        });
        const nameService = new lib_1.Service(stack, 'name', {
            environment,
            serviceDescription: nameDescription,
        });
        greeterService.connectTo(nameService);
        greeterService.connectTo(greetingService);
        // THEN
        assertions_1.Template.fromStack(stack).hasResource('AWS::ECS::TaskDefinition', assertions_1.Match.anyValue());
    });
    test('should detect when attempting to connect services from two different envs', () => {
        // GIVEN
        const stack = new cdk.Stack();
        // WHEN
        const production = new lib_1.Environment(stack, 'production');
        const development = new lib_1.Environment(stack, 'development');
        const productionMesh = new appmesh.Mesh(stack, 'production-mesh');
        const developmentMesh = new appmesh.Mesh(stack, 'development-mesh');
        /** Production name service */
        const productionNameDescription = new lib_1.ServiceDescription();
        productionNameDescription.add(new lib_1.Container({
            cpu: 1024,
            memoryMiB: 2048,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
            environment: {
                PORT: '80',
            },
        }));
        productionNameDescription.add(new lib_1.AppMeshExtension({ mesh: productionMesh }));
        const productionNameService = new lib_1.Service(stack, 'name-production', {
            environment: production,
            serviceDescription: productionNameDescription,
        });
        /** Development name service */
        const developmentNameDescription = new lib_1.ServiceDescription();
        developmentNameDescription.add(new lib_1.Container({
            cpu: 1024,
            memoryMiB: 2048,
            trafficPort: 80,
            image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
            environment: {
                PORT: '80',
            },
        }));
        developmentNameDescription.add(new lib_1.AppMeshExtension({ mesh: developmentMesh }));
        const developmentNameService = new lib_1.Service(stack, 'name-development', {
            environment: development,
            serviceDescription: developmentNameDescription,
        });
        // THEN
        expect(() => {
            developmentNameService.connectTo(productionNameService);
        }).toThrow(/Unable to connect service 'name-development' in environment 'development' to service 'name-production' in environment 'production' because services can not be connected across environment boundaries/);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbWVzaC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwbWVzaC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0RBQXNEO0FBQ3RELGdEQUFnRDtBQUNoRCx3Q0FBd0M7QUFDeEMscUNBQXFDO0FBQ3JDLGdDQUErRjtBQUUvRixRQUFRLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUN2QixJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQzNELFFBQVE7UUFDUixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5QixPQUFPO1FBQ1AsTUFBTSxXQUFXLEdBQUcsSUFBSSxpQkFBVyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztRQUV6RCxNQUFNLGtCQUFrQixHQUFHLElBQUksd0JBQWtCLEVBQUUsQ0FBQztRQUVwRCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFTLENBQUM7WUFDbkMsR0FBRyxFQUFFLEdBQUc7WUFDUixTQUFTLEVBQUUsR0FBRztZQUNkLFdBQVcsRUFBRSxFQUFFO1lBQ2YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO1NBQzFELENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVoRCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBZ0IsQ0FBQztZQUMxQyxJQUFJO1NBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLGFBQU8sQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFO1lBQy9CLFdBQVc7WUFDWCxrQkFBa0I7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTztRQUNQLDJDQUEyQztRQUMzQyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxxQkFB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RCwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFTLENBQUM7WUFDM0MsR0FBRyxFQUFFLElBQUk7WUFDVCxTQUFTLEVBQUUsSUFBSTtZQUNmLFdBQVcsRUFBRSxFQUFFO1lBQ2YsS0FBSyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDO1lBQ3pELFdBQVcsRUFBRTtnQkFDWCxJQUFJLEVBQUUsSUFBSTthQUNYO1NBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSiwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBZ0IsQ0FBQyxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFaEYsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLGFBQU8sQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7WUFDcEUsV0FBVyxFQUFFLFdBQVc7WUFDeEIsa0JBQWtCLEVBQUUsMEJBQTBCO1NBQy9DLENBQUMsQ0FBQztRQUVILE9BQU87UUFDUCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1Ysc0JBQXNCLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHdNQUF3TSxDQUFDLENBQUM7SUFDdk4sQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1hdGNoLCBUZW1wbGF0ZSB9IGZyb20gJ0Bhd3MtY2RrL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgYXBwbWVzaCBmcm9tICdAYXdzLWNkay9hd3MtYXBwbWVzaCc7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBBcHBNZXNoRXh0ZW5zaW9uLCBDb250YWluZXIsIEVudmlyb25tZW50LCBTZXJ2aWNlRGVzY3JpcHRpb24sIFNlcnZpY2UgfSBmcm9tICcuLi9saWInO1xuXG5kZXNjcmliZSgnYXBwbWVzaCcsICgpID0+IHtcbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gYWRkIEFXUyBBcHAgTWVzaCB0byBhIHNlcnZpY2UnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcblxuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IG1lc2ggPSBuZXcgYXBwbWVzaC5NZXNoKHN0YWNrLCAnbXktbWVzaCcpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQXBwTWVzaEV4dGVuc2lvbih7XG4gICAgICBtZXNoLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gVEhFTlxuICAgIC8vIEVuc3VyZSB0aGF0IHRhc2sgaGFzIGFuIEFwcCBNZXNoIHNpZGVjYXJcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIENwdTogMjU2LFxuICAgICAgICAgIERlcGVuZHNPbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb25kaXRpb246ICdIRUFMVEhZJyxcbiAgICAgICAgICAgICAgQ29udGFpbmVyTmFtZTogJ2Vudm95JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgSW1hZ2U6ICduYXRoYW5wZWNrL25hbWUnLFxuICAgICAgICAgIE1lbW9yeTogNTEyLFxuICAgICAgICAgIE5hbWU6ICdhcHAnLFxuICAgICAgICAgIFBvcnRNYXBwaW5nczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb250YWluZXJQb3J0OiA4MCxcbiAgICAgICAgICAgICAgUHJvdG9jb2w6ICd0Y3AnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFVsaW1pdHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgSGFyZExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgICBOYW1lOiAnbm9maWxlJyxcbiAgICAgICAgICAgICAgU29mdExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgRW52aXJvbm1lbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ0FQUE1FU0hfVklSVFVBTF9OT0RFX05BTUUnLFxuICAgICAgICAgICAgICBWYWx1ZToge1xuICAgICAgICAgICAgICAgICdGbjo6Sm9pbic6IFtcbiAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICAgICAnbWVzaC8nLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAnbXltZXNoRUE2N0VERUYnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ01lc2hOYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAnL3ZpcnR1YWxOb2RlL215LXNlcnZpY2UnLFxuICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ0FXU19SRUdJT04nLFxuICAgICAgICAgICAgICBWYWx1ZToge1xuICAgICAgICAgICAgICAgIFJlZjogJ0FXUzo6UmVnaW9uJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIE5hbWU6ICdFTkFCTEVfRU5WT1lfU1RBVFNfVEFHUycsXG4gICAgICAgICAgICAgIFZhbHVlOiAnMScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBOYW1lOiAnRU5BQkxFX0VOVk9ZX0RPR19TVEFUU0QnLFxuICAgICAgICAgICAgICBWYWx1ZTogJzEnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIEVzc2VudGlhbDogdHJ1ZSxcbiAgICAgICAgICBIZWFsdGhDaGVjazoge1xuICAgICAgICAgICAgQ29tbWFuZDogW1xuICAgICAgICAgICAgICAnQ01ELVNIRUxMJyxcbiAgICAgICAgICAgICAgJ2N1cmwgLXMgaHR0cDovL2xvY2FsaG9zdDo5OTAxL3NlcnZlcl9pbmZvIHwgZ3JlcCBzdGF0ZSB8IGdyZXAgLXEgTElWRScsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgSW50ZXJ2YWw6IDUsXG4gICAgICAgICAgICBSZXRyaWVzOiAzLFxuICAgICAgICAgICAgU3RhcnRQZXJpb2Q6IDEwLFxuICAgICAgICAgICAgVGltZW91dDogMixcbiAgICAgICAgICB9LFxuICAgICAgICAgIEltYWdlOiB7XG4gICAgICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgJ0ZuOjpGaW5kSW5NYXAnOiBbXG4gICAgICAgICAgICAgICAgICAgICdteXNlcnZpY2VlbnZveWltYWdlYWNjb3VudG1hcHBpbmcnLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgUmVmOiAnQVdTOjpSZWdpb24nLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAnZWNyUmVwbycsXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJy5ka3IuZWNyLicsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgUmVmOiAnQVdTOjpSZWdpb24nLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJy4nLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIFJlZjogJ0FXUzo6VVJMU3VmZml4JyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICcvYXdzLWFwcG1lc2gtZW52b3k6djEuMTUuMS4wLXByb2QnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIExvZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIExvZ0RyaXZlcjogJ2F3c2xvZ3MnLFxuICAgICAgICAgICAgT3B0aW9uczoge1xuICAgICAgICAgICAgICAnYXdzbG9ncy1ncm91cCc6IHtcbiAgICAgICAgICAgICAgICBSZWY6ICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvbmVudm95TG9nR3JvdXAwQzI3RUJEQicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICdhd3Nsb2dzLXN0cmVhbS1wcmVmaXgnOiAnZW52b3knLFxuICAgICAgICAgICAgICAnYXdzbG9ncy1yZWdpb24nOiB7XG4gICAgICAgICAgICAgICAgUmVmOiAnQVdTOjpSZWdpb24nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIE1lbW9yeVJlc2VydmF0aW9uOiAxMjgsXG4gICAgICAgICAgTmFtZTogJ2Vudm95JyxcbiAgICAgICAgICBVbGltaXRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIEhhcmRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgICAgTmFtZTogJ25vZmlsZScsXG4gICAgICAgICAgICAgIFNvZnRMaW1pdDogMTAyNDAwMCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBVc2VyOiAnMTMzNycsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgQ3B1OiAnMjU2JyxcbiAgICAgIEV4ZWN1dGlvblJvbGVBcm46IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ215c2VydmljZXRhc2tkZWZpbml0aW9uRXhlY3V0aW9uUm9sZTBDRTc0QUQwJyxcbiAgICAgICAgICAnQXJuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBGYW1pbHk6ICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvbicsXG4gICAgICBNZW1vcnk6ICc1MTInLFxuICAgICAgTmV0d29ya01vZGU6ICdhd3N2cGMnLFxuICAgICAgUHJveHlDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIENvbnRhaW5lck5hbWU6ICdlbnZveScsXG4gICAgICAgIFByb3h5Q29uZmlndXJhdGlvblByb3BlcnRpZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBOYW1lOiAnQXBwUG9ydHMnLFxuICAgICAgICAgICAgVmFsdWU6ICc4MCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBOYW1lOiAnUHJveHlFZ3Jlc3NQb3J0JyxcbiAgICAgICAgICAgIFZhbHVlOiAnMTUwMDEnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgTmFtZTogJ1Byb3h5SW5ncmVzc1BvcnQnLFxuICAgICAgICAgICAgVmFsdWU6ICcxNTAwMCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBOYW1lOiAnSWdub3JlZFVJRCcsXG4gICAgICAgICAgICBWYWx1ZTogJzEzMzcnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgTmFtZTogJ0lnbm9yZWRHSUQnLFxuICAgICAgICAgICAgVmFsdWU6ICcxMzM4JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIE5hbWU6ICdFZ3Jlc3NJZ25vcmVkSVBzJyxcbiAgICAgICAgICAgIFZhbHVlOiAnMTY5LjI1NC4xNzAuMiwxNjkuMjU0LjE2OS4yNTQnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIFR5cGU6ICdBUFBNRVNIJyxcbiAgICAgIH0sXG4gICAgICBSZXF1aXJlc0NvbXBhdGliaWxpdGllczogW1xuICAgICAgICAnRUMyJyxcbiAgICAgICAgJ0ZBUkdBVEUnLFxuICAgICAgXSxcbiAgICAgIFRhc2tSb2xlQXJuOiB7XG4gICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvblRhc2tSb2xlOTJBQ0Q5MDMnLFxuICAgICAgICAgICdBcm4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBzZXJ2aWNlIGhhcyB0aGUgcmlnaHQgc2V0dGluZ3NcbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlNlcnZpY2UnLCB7XG4gICAgICBDbHVzdGVyOiB7XG4gICAgICAgIFJlZjogJ3Byb2R1Y3Rpb25lbnZpcm9ubWVudGNsdXN0ZXJDNjU5OUQyRCcsXG4gICAgICB9LFxuICAgICAgRGVwbG95bWVudENvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgTWF4aW11bVBlcmNlbnQ6IDIwMCxcbiAgICAgICAgTWluaW11bUhlYWx0aHlQZXJjZW50OiAxMDAsXG4gICAgICB9LFxuICAgICAgRGVzaXJlZENvdW50OiAxLFxuICAgICAgRW5hYmxlRUNTTWFuYWdlZFRhZ3M6IGZhbHNlLFxuICAgICAgTGF1bmNoVHlwZTogJ0ZBUkdBVEUnLFxuICAgICAgTmV0d29ya0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgQXdzdnBjQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgIEFzc2lnblB1YmxpY0lwOiAnRElTQUJMRUQnLFxuICAgICAgICAgIFNlY3VyaXR5R3JvdXBzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICAgICAgICdteXNlcnZpY2VzZXJ2aWNlU2VjdXJpdHlHcm91cDNBNDRBOTY5JyxcbiAgICAgICAgICAgICAgICAnR3JvdXBJZCcsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgU3VibmV0czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBSZWY6ICdwcm9kdWN0aW9uZW52aXJvbm1lbnR2cGNQcml2YXRlU3VibmV0MVN1Ym5ldDUzRjYzMkU2JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFJlZjogJ3Byb2R1Y3Rpb25lbnZpcm9ubWVudHZwY1ByaXZhdGVTdWJuZXQyU3VibmV0NzU2RkI5M0MnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIFNlcnZpY2VSZWdpc3RyaWVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBSZWdpc3RyeUFybjoge1xuICAgICAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgICAgICdteXNlcnZpY2VzZXJ2aWNlQ2xvdWRtYXBTZXJ2aWNlMzJGNjMxNjMnLFxuICAgICAgICAgICAgICAnQXJuJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBUYXNrRGVmaW5pdGlvbjoge1xuICAgICAgICBSZWY6ICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvbkYzRTJEODZGJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBoYXZlIHRoZSByaWdodCBtYXhpbXVtUGVyY2VudGFnZSBhdCBkZXNpcmVkIGNvdW50ID09IDEnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcblxuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IG1lc2ggPSBuZXcgYXBwbWVzaC5NZXNoKHN0YWNrLCAnbXktbWVzaCcpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQXBwTWVzaEV4dGVuc2lvbih7XG4gICAgICBtZXNoLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgZGVzaXJlZENvdW50OiAxLFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgRGVwbG95bWVudENvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgTWF4aW11bVBlcmNlbnQ6IDIwMCxcbiAgICAgICAgTWluaW11bUhlYWx0aHlQZXJjZW50OiAxMDAsXG4gICAgICB9LFxuICAgICAgRGVzaXJlZENvdW50OiAxLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgaGF2ZSB0aGUgcmlnaHQgbWF4aW11bVBlcmNlbnRhZ2UgYXQgZGVzaXJlZCBjb3VudCA9PSAyJywgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKCk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG5cbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBjb25zdCBtZXNoID0gbmV3IGFwcG1lc2guTWVzaChzdGFjaywgJ215LW1lc2gnKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IEFwcE1lc2hFeHRlbnNpb24oe1xuICAgICAgbWVzaCxcbiAgICB9KSk7XG5cbiAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICAgIGRlc2lyZWRDb3VudDogMixcbiAgICB9KTtcblxuICAgIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaykuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDUzo6U2VydmljZScsIHtcbiAgICAgIERlcGxveW1lbnRDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIE1heGltdW1QZXJjZW50OiAxNTAsXG4gICAgICAgIE1pbmltdW1IZWFsdGh5UGVyY2VudDogMTAwLFxuICAgICAgfSxcbiAgICAgIERlc2lyZWRDb3VudDogMixcbiAgICB9KTtcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGhhdmUgdGhlIHJpZ2h0IG1heGltdW1QZXJjZW50YWdlIGF0IGRlc2lyZWQgY291bnQgPT0gMycsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuXG4gICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMjU2LFxuICAgICAgbWVtb3J5TWlCOiA1MTIsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgfSkpO1xuXG4gICAgY29uc3QgbWVzaCA9IG5ldyBhcHBtZXNoLk1lc2goc3RhY2ssICdteS1tZXNoJyk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBBcHBNZXNoRXh0ZW5zaW9uKHtcbiAgICAgIG1lc2gsXG4gICAgfSkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgICBkZXNpcmVkQ291bnQ6IDMsXG4gICAgfSk7XG5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlNlcnZpY2UnLCB7XG4gICAgICBEZXBsb3ltZW50Q29uZmlndXJhdGlvbjoge1xuICAgICAgICBNYXhpbXVtUGVyY2VudDogMTUwLFxuICAgICAgICBNaW5pbXVtSGVhbHRoeVBlcmNlbnQ6IDEwMCxcbiAgICAgIH0sXG4gICAgICBEZXNpcmVkQ291bnQ6IDMsXG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBoYXZlIHRoZSByaWdodCBtYXhpbXVtUGVyY2VudGFnZSBhdCBkZXNpcmVkIGNvdW50ID09IDQnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcblxuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IG1lc2ggPSBuZXcgYXBwbWVzaC5NZXNoKHN0YWNrLCAnbXktbWVzaCcpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQXBwTWVzaEV4dGVuc2lvbih7XG4gICAgICBtZXNoLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgZGVzaXJlZENvdW50OiA0LFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgRGVwbG95bWVudENvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgTWF4aW11bVBlcmNlbnQ6IDEyNSxcbiAgICAgICAgTWluaW11bUhlYWx0aHlQZXJjZW50OiAxMDAsXG4gICAgICB9LFxuICAgICAgRGVzaXJlZENvdW50OiA0LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgaGF2ZSB0aGUgcmlnaHQgbWF4aW11bVBlcmNlbnRhZ2UgYXQgZGVzaXJlZCBjb3VudCA+IDQnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcblxuICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IG5ldyBTZXJ2aWNlRGVzY3JpcHRpb24oKTtcblxuICAgIHNlcnZpY2VEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IG1lc2ggPSBuZXcgYXBwbWVzaC5NZXNoKHN0YWNrLCAnbXktbWVzaCcpO1xuXG4gICAgc2VydmljZURlc2NyaXB0aW9uLmFkZChuZXcgQXBwTWVzaEV4dGVuc2lvbih7XG4gICAgICBtZXNoLFxuICAgIH0pKTtcblxuICAgIG5ldyBTZXJ2aWNlKHN0YWNrLCAnbXktc2VydmljZScsIHtcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uLFxuICAgICAgZGVzaXJlZENvdW50OiA4LFxuICAgIH0pO1xuXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpTZXJ2aWNlJywge1xuICAgICAgRGVwbG95bWVudENvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgTWF4aW11bVBlcmNlbnQ6IDEyNSxcbiAgICAgICAgTWluaW11bUhlYWx0aHlQZXJjZW50OiAxMDAsXG4gICAgICB9LFxuICAgICAgRGVzaXJlZENvdW50OiA4LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgYmUgYWJsZSB0byBjcmVhdGUgbXVsdGlwbGUgQXBwIE1lc2ggZW5hYmxlZCBzZXJ2aWNlcyBhbmQgY29ubmVjdCcsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IG1lc2ggPSBuZXcgYXBwbWVzaC5NZXNoKHN0YWNrLCAnbXktbWVzaCcpO1xuICAgIGNvbnN0IGVudmlyb25tZW50ID0gbmV3IEVudmlyb25tZW50KHN0YWNrLCAncHJvZHVjdGlvbicpO1xuXG4gICAgY29uc3QgbmFtZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuICAgIG5hbWVEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svbmFtZScpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUE9SVDogJzgwJyxcbiAgICAgIH0sXG4gICAgfSkpO1xuICAgIG5hbWVEZXNjcmlwdGlvbi5hZGQobmV3IEFwcE1lc2hFeHRlbnNpb24oeyBtZXNoIH0pKTtcblxuICAgIGNvbnN0IGdyZWV0aW5nRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG4gICAgZ3JlZXRpbmdEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svZ3JlZXRpbmcnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBPUlQ6ICc4MCcsXG4gICAgICB9LFxuICAgIH0pKTtcbiAgICBncmVldGluZ0Rlc2NyaXB0aW9uLmFkZChuZXcgQXBwTWVzaEV4dGVuc2lvbih7IG1lc2ggfSkpO1xuXG4gICAgY29uc3QgZ3JlZXRlckRlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuICAgIGdyZWV0ZXJEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDI1NixcbiAgICAgIG1lbW9yeU1pQjogNTEyLFxuICAgICAgdHJhZmZpY1BvcnQ6IDgwLFxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25hdGhhbnBlY2svZ3JlZXRlcicpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUE9SVDogJzgwJyxcbiAgICAgIH0sXG4gICAgfSkpO1xuICAgIGdyZWV0ZXJEZXNjcmlwdGlvbi5hZGQobmV3IEFwcE1lc2hFeHRlbnNpb24oeyBtZXNoIH0pKTtcblxuICAgIGNvbnN0IGdyZWV0ZXJTZXJ2aWNlID0gbmV3IFNlcnZpY2Uoc3RhY2ssICdncmVldGVyJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb246IGdyZWV0ZXJEZXNjcmlwdGlvbixcbiAgICB9KTtcbiAgICBjb25zdCBncmVldGluZ1NlcnZpY2UgPSBuZXcgU2VydmljZShzdGFjaywgJ2dyZWV0aW5nJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb246IGdyZWV0aW5nRGVzY3JpcHRpb24sXG4gICAgfSk7XG4gICAgY29uc3QgbmFtZVNlcnZpY2UgPSBuZXcgU2VydmljZShzdGFjaywgJ25hbWUnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbjogbmFtZURlc2NyaXB0aW9uLFxuICAgIH0pO1xuXG4gICAgZ3JlZXRlclNlcnZpY2UuY29ubmVjdFRvKG5hbWVTZXJ2aWNlKTtcbiAgICBncmVldGVyU2VydmljZS5jb25uZWN0VG8oZ3JlZXRpbmdTZXJ2aWNlKTtcblxuICAgIC8vIFRIRU5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlKCdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nLCBNYXRjaC5hbnlWYWx1ZSgpKTtcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGRldGVjdCB3aGVuIGF0dGVtcHRpbmcgdG8gY29ubmVjdCBzZXJ2aWNlcyBmcm9tIHR3byBkaWZmZXJlbnQgZW52cycsICgpID0+IHtcbiAgICAvLyBHSVZFTlxuICAgIGNvbnN0IHN0YWNrID0gbmV3IGNkay5TdGFjaygpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHByb2R1Y3Rpb24gPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdwcm9kdWN0aW9uJyk7XG4gICAgY29uc3QgZGV2ZWxvcG1lbnQgPSBuZXcgRW52aXJvbm1lbnQoc3RhY2ssICdkZXZlbG9wbWVudCcpO1xuXG4gICAgY29uc3QgcHJvZHVjdGlvbk1lc2ggPSBuZXcgYXBwbWVzaC5NZXNoKHN0YWNrLCAncHJvZHVjdGlvbi1tZXNoJyk7XG4gICAgY29uc3QgZGV2ZWxvcG1lbnRNZXNoID0gbmV3IGFwcG1lc2guTWVzaChzdGFjaywgJ2RldmVsb3BtZW50LW1lc2gnKTtcblxuICAgIC8qKiBQcm9kdWN0aW9uIG5hbWUgc2VydmljZSAqL1xuICAgIGNvbnN0IHByb2R1Y3Rpb25OYW1lRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG4gICAgcHJvZHVjdGlvbk5hbWVEZXNjcmlwdGlvbi5hZGQobmV3IENvbnRhaW5lcih7XG4gICAgICBjcHU6IDEwMjQsXG4gICAgICBtZW1vcnlNaUI6IDIwNDgsXG4gICAgICB0cmFmZmljUG9ydDogODAsXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnbmF0aGFucGVjay9uYW1lJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQT1JUOiAnODAnLFxuICAgICAgfSxcbiAgICB9KSk7XG4gICAgcHJvZHVjdGlvbk5hbWVEZXNjcmlwdGlvbi5hZGQobmV3IEFwcE1lc2hFeHRlbnNpb24oeyBtZXNoOiBwcm9kdWN0aW9uTWVzaCB9KSk7XG5cbiAgICBjb25zdCBwcm9kdWN0aW9uTmFtZVNlcnZpY2UgPSBuZXcgU2VydmljZShzdGFjaywgJ25hbWUtcHJvZHVjdGlvbicsIHtcbiAgICAgIGVudmlyb25tZW50OiBwcm9kdWN0aW9uLFxuICAgICAgc2VydmljZURlc2NyaXB0aW9uOiBwcm9kdWN0aW9uTmFtZURlc2NyaXB0aW9uLFxuICAgIH0pO1xuXG4gICAgLyoqIERldmVsb3BtZW50IG5hbWUgc2VydmljZSAqL1xuICAgIGNvbnN0IGRldmVsb3BtZW50TmFtZURlc2NyaXB0aW9uID0gbmV3IFNlcnZpY2VEZXNjcmlwdGlvbigpO1xuICAgIGRldmVsb3BtZW50TmFtZURlc2NyaXB0aW9uLmFkZChuZXcgQ29udGFpbmVyKHtcbiAgICAgIGNwdTogMTAyNCxcbiAgICAgIG1lbW9yeU1pQjogMjA0OCxcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBPUlQ6ICc4MCcsXG4gICAgICB9LFxuICAgIH0pKTtcbiAgICBkZXZlbG9wbWVudE5hbWVEZXNjcmlwdGlvbi5hZGQobmV3IEFwcE1lc2hFeHRlbnNpb24oeyBtZXNoOiBkZXZlbG9wbWVudE1lc2ggfSkpO1xuXG4gICAgY29uc3QgZGV2ZWxvcG1lbnROYW1lU2VydmljZSA9IG5ldyBTZXJ2aWNlKHN0YWNrLCAnbmFtZS1kZXZlbG9wbWVudCcsIHtcbiAgICAgIGVudmlyb25tZW50OiBkZXZlbG9wbWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbjogZGV2ZWxvcG1lbnROYW1lRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgZXhwZWN0KCgpID0+IHtcbiAgICAgIGRldmVsb3BtZW50TmFtZVNlcnZpY2UuY29ubmVjdFRvKHByb2R1Y3Rpb25OYW1lU2VydmljZSk7XG4gICAgfSkudG9UaHJvdygvVW5hYmxlIHRvIGNvbm5lY3Qgc2VydmljZSAnbmFtZS1kZXZlbG9wbWVudCcgaW4gZW52aXJvbm1lbnQgJ2RldmVsb3BtZW50JyB0byBzZXJ2aWNlICduYW1lLXByb2R1Y3Rpb24nIGluIGVudmlyb25tZW50ICdwcm9kdWN0aW9uJyBiZWNhdXNlIHNlcnZpY2VzIGNhbiBub3QgYmUgY29ubmVjdGVkIGFjcm9zcyBlbnZpcm9ubWVudCBib3VuZGFyaWVzLyk7XG4gIH0pO1xufSk7Il19