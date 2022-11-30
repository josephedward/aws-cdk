"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('xray', () => {
    test('should be able to add AWS X-Ray to a service', () => {
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
        serviceDescription.add(new lib_1.XRayExtension());
        new lib_1.Service(stack, 'my-service', {
            environment,
            serviceDescription,
        });
        // THEN
        assertions_1.Template.fromStack(stack).hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Cpu: 256,
                    DependsOn: [
                        {
                            Condition: 'HEALTHY',
                            ContainerName: 'xray',
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
                            Name: 'AWS_REGION',
                            Value: {
                                Ref: 'AWS::Region',
                            },
                        },
                    ],
                    Essential: true,
                    HealthCheck: {
                        Command: [
                            'CMD-SHELL',
                            'curl -s http://localhost:2000',
                        ],
                        Interval: 5,
                        Retries: 3,
                        StartPeriod: 10,
                        Timeout: 2,
                    },
                    Image: 'amazon/aws-xray-daemon:latest',
                    LogConfiguration: {
                        LogDriver: 'awslogs',
                        Options: {
                            'awslogs-group': {
                                Ref: 'myservicetaskdefinitionxrayLogGroupC0252525',
                            },
                            'awslogs-stream-prefix': 'xray',
                            'awslogs-region': {
                                Ref: 'AWS::Region',
                            },
                        },
                    },
                    MemoryReservation: 256,
                    Name: 'xray',
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
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHJheS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsieHJheS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0RBQStDO0FBQy9DLHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFDckMsZ0NBQTRGO0FBRTVGLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO0lBQ3BCLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlCLE9BQU87UUFDUCxNQUFNLFdBQVcsR0FBRyxJQUFJLGlCQUFXLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx3QkFBa0IsRUFBRSxDQUFDO1FBRXBELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQVMsQ0FBQztZQUNuQyxHQUFHLEVBQUUsR0FBRztZQUNSLFNBQVMsRUFBRSxHQUFHO1lBQ2QsV0FBVyxFQUFFLEVBQUU7WUFDZixLQUFLLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7U0FDMUQsQ0FBQyxDQUFDLENBQUM7UUFFSixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxtQkFBYSxFQUFFLENBQUMsQ0FBQztRQUU1QyxJQUFJLGFBQU8sQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFO1lBQy9CLFdBQVc7WUFDWCxrQkFBa0I7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTztRQUNQLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLHFCQUFxQixDQUFDLDBCQUEwQixFQUFFO1lBQzFFLG9CQUFvQixFQUFFO2dCQUNwQjtvQkFDRSxHQUFHLEVBQUUsR0FBRztvQkFDUixTQUFTLEVBQUU7d0JBQ1Q7NEJBQ0UsU0FBUyxFQUFFLFNBQVM7NEJBQ3BCLGFBQWEsRUFBRSxNQUFNO3lCQUN0QjtxQkFDRjtvQkFDRCxTQUFTLEVBQUUsSUFBSTtvQkFDZixLQUFLLEVBQUUsaUJBQWlCO29CQUN4QixNQUFNLEVBQUUsR0FBRztvQkFDWCxJQUFJLEVBQUUsS0FBSztvQkFDWCxZQUFZLEVBQUU7d0JBQ1o7NEJBQ0UsYUFBYSxFQUFFLEVBQUU7NEJBQ2pCLFFBQVEsRUFBRSxLQUFLO3lCQUNoQjtxQkFDRjtvQkFDRCxPQUFPLEVBQUU7d0JBQ1A7NEJBQ0UsU0FBUyxFQUFFLE9BQU87NEJBQ2xCLElBQUksRUFBRSxRQUFROzRCQUNkLFNBQVMsRUFBRSxPQUFPO3lCQUNuQjtxQkFDRjtpQkFDRjtnQkFDRDtvQkFDRSxXQUFXLEVBQUU7d0JBQ1g7NEJBQ0UsSUFBSSxFQUFFLFlBQVk7NEJBQ2xCLEtBQUssRUFBRTtnQ0FDTCxHQUFHLEVBQUUsYUFBYTs2QkFDbkI7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsU0FBUyxFQUFFLElBQUk7b0JBQ2YsV0FBVyxFQUFFO3dCQUNYLE9BQU8sRUFBRTs0QkFDUCxXQUFXOzRCQUNYLCtCQUErQjt5QkFDaEM7d0JBQ0QsUUFBUSxFQUFFLENBQUM7d0JBQ1gsT0FBTyxFQUFFLENBQUM7d0JBQ1YsV0FBVyxFQUFFLEVBQUU7d0JBQ2YsT0FBTyxFQUFFLENBQUM7cUJBQ1g7b0JBQ0QsS0FBSyxFQUFFLCtCQUErQjtvQkFDdEMsZ0JBQWdCLEVBQUU7d0JBQ2hCLFNBQVMsRUFBRSxTQUFTO3dCQUNwQixPQUFPLEVBQUU7NEJBQ1AsZUFBZSxFQUFFO2dDQUNmLEdBQUcsRUFBRSw2Q0FBNkM7NkJBQ25EOzRCQUNELHVCQUF1QixFQUFFLE1BQU07NEJBQy9CLGdCQUFnQixFQUFFO2dDQUNoQixHQUFHLEVBQUUsYUFBYTs2QkFDbkI7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsaUJBQWlCLEVBQUUsR0FBRztvQkFDdEIsSUFBSSxFQUFFLE1BQU07b0JBQ1osSUFBSSxFQUFFLE1BQU07aUJBQ2I7YUFDRjtZQUNELEdBQUcsRUFBRSxLQUFLO1lBQ1YsZ0JBQWdCLEVBQUU7Z0JBQ2hCLFlBQVksRUFBRTtvQkFDWiw4Q0FBOEM7b0JBQzlDLEtBQUs7aUJBQ047YUFDRjtZQUNELE1BQU0sRUFBRSx5QkFBeUI7WUFDakMsTUFBTSxFQUFFLEtBQUs7WUFDYixXQUFXLEVBQUUsUUFBUTtZQUNyQix1QkFBdUIsRUFBRTtnQkFDdkIsS0FBSztnQkFDTCxTQUFTO2FBQ1Y7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsWUFBWSxFQUFFO29CQUNaLHlDQUF5QztvQkFDekMsS0FBSztpQkFDTjthQUNGO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRlbXBsYXRlIH0gZnJvbSAnQGF3cy1jZGsvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBDb250YWluZXIsIEVudmlyb25tZW50LCBYUmF5RXh0ZW5zaW9uLCBTZXJ2aWNlLCBTZXJ2aWNlRGVzY3JpcHRpb24gfSBmcm9tICcuLi9saWInO1xuXG5kZXNjcmliZSgneHJheScsICgpID0+IHtcbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gYWRkIEFXUyBYLVJheSB0byBhIHNlcnZpY2UnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBYUmF5RXh0ZW5zaW9uKCkpO1xuXG4gICAgbmV3IFNlcnZpY2Uoc3RhY2ssICdteS1zZXJ2aWNlJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBzZXJ2aWNlRGVzY3JpcHRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBUSEVOXG4gICAgVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgIENvbnRhaW5lckRlZmluaXRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBDcHU6IDI1NixcbiAgICAgICAgICBEZXBlbmRzT246IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgQ29uZGl0aW9uOiAnSEVBTFRIWScsXG4gICAgICAgICAgICAgIENvbnRhaW5lck5hbWU6ICd4cmF5JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgSW1hZ2U6ICduYXRoYW5wZWNrL25hbWUnLFxuICAgICAgICAgIE1lbW9yeTogNTEyLFxuICAgICAgICAgIE5hbWU6ICdhcHAnLFxuICAgICAgICAgIFBvcnRNYXBwaW5nczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb250YWluZXJQb3J0OiA4MCxcbiAgICAgICAgICAgICAgUHJvdG9jb2w6ICd0Y3AnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFVsaW1pdHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgSGFyZExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgICBOYW1lOiAnbm9maWxlJyxcbiAgICAgICAgICAgICAgU29mdExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgRW52aXJvbm1lbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ0FXU19SRUdJT04nLFxuICAgICAgICAgICAgICBWYWx1ZToge1xuICAgICAgICAgICAgICAgIFJlZjogJ0FXUzo6UmVnaW9uJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgSGVhbHRoQ2hlY2s6IHtcbiAgICAgICAgICAgIENvbW1hbmQ6IFtcbiAgICAgICAgICAgICAgJ0NNRC1TSEVMTCcsXG4gICAgICAgICAgICAgICdjdXJsIC1zIGh0dHA6Ly9sb2NhbGhvc3Q6MjAwMCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgSW50ZXJ2YWw6IDUsXG4gICAgICAgICAgICBSZXRyaWVzOiAzLFxuICAgICAgICAgICAgU3RhcnRQZXJpb2Q6IDEwLFxuICAgICAgICAgICAgVGltZW91dDogMixcbiAgICAgICAgICB9LFxuICAgICAgICAgIEltYWdlOiAnYW1hem9uL2F3cy14cmF5LWRhZW1vbjpsYXRlc3QnLFxuICAgICAgICAgIExvZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgICAgICAgIExvZ0RyaXZlcjogJ2F3c2xvZ3MnLFxuICAgICAgICAgICAgT3B0aW9uczoge1xuICAgICAgICAgICAgICAnYXdzbG9ncy1ncm91cCc6IHtcbiAgICAgICAgICAgICAgICBSZWY6ICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvbnhyYXlMb2dHcm91cEMwMjUyNTI1JyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgJ2F3c2xvZ3Mtc3RyZWFtLXByZWZpeCc6ICd4cmF5JyxcbiAgICAgICAgICAgICAgJ2F3c2xvZ3MtcmVnaW9uJzoge1xuICAgICAgICAgICAgICAgIFJlZjogJ0FXUzo6UmVnaW9uJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBNZW1vcnlSZXNlcnZhdGlvbjogMjU2LFxuICAgICAgICAgIE5hbWU6ICd4cmF5JyxcbiAgICAgICAgICBVc2VyOiAnMTMzNycsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgQ3B1OiAnMjU2JyxcbiAgICAgIEV4ZWN1dGlvblJvbGVBcm46IHtcbiAgICAgICAgJ0ZuOjpHZXRBdHQnOiBbXG4gICAgICAgICAgJ215c2VydmljZXRhc2tkZWZpbml0aW9uRXhlY3V0aW9uUm9sZTBDRTc0QUQwJyxcbiAgICAgICAgICAnQXJuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBGYW1pbHk6ICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvbicsXG4gICAgICBNZW1vcnk6ICc1MTInLFxuICAgICAgTmV0d29ya01vZGU6ICdhd3N2cGMnLFxuICAgICAgUmVxdWlyZXNDb21wYXRpYmlsaXRpZXM6IFtcbiAgICAgICAgJ0VDMicsXG4gICAgICAgICdGQVJHQVRFJyxcbiAgICAgIF0sXG4gICAgICBUYXNrUm9sZUFybjoge1xuICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAnbXlzZXJ2aWNldGFza2RlZmluaXRpb25UYXNrUm9sZTkyQUNEOTAzJyxcbiAgICAgICAgICAnQXJuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xufSk7Il19