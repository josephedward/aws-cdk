"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("@aws-cdk/assertions");
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
const lib_1 = require("../lib");
describe('cloudwatch agent', () => {
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
        serviceDescription.add(new lib_1.CloudwatchAgentExtension());
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
                            Condition: 'START',
                            ContainerName: 'cloudwatch-agent',
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
                            Name: 'CW_CONFIG_CONTENT',
                            Value: '{"logs":{"metrics_collected":{"emf":{}}},"metrics":{"metrics_collected":{"statsd":{}}}}',
                        },
                    ],
                    Essential: true,
                    Image: 'amazon/cloudwatch-agent:latest',
                    LogConfiguration: {
                        LogDriver: 'awslogs',
                        Options: {
                            'awslogs-group': {
                                Ref: 'myservicetaskdefinitioncloudwatchagentLogGroupDF0CD679',
                            },
                            'awslogs-stream-prefix': 'cloudwatch-agent',
                            'awslogs-region': {
                                Ref: 'AWS::Region',
                            },
                        },
                    },
                    MemoryReservation: 50,
                    Name: 'cloudwatch-agent',
                    User: '0:1338',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvdWR3YXRjaC1hZ2VudC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xvdWR3YXRjaC1hZ2VudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0RBQStDO0FBQy9DLHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFDckMsZ0NBQXVHO0FBRXZHLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxRQUFRO1FBQ1IsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFOUIsT0FBTztRQUNQLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQVcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHdCQUFrQixFQUFFLENBQUM7UUFFcEQsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksZUFBUyxDQUFDO1lBQ25DLEdBQUcsRUFBRSxHQUFHO1lBQ1IsU0FBUyxFQUFFLEdBQUc7WUFDZCxXQUFXLEVBQUUsRUFBRTtZQUNmLEtBQUssRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztTQUMxRCxDQUFDLENBQUMsQ0FBQztRQUVKLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLDhCQUF3QixFQUFFLENBQUMsQ0FBQztRQUV2RCxJQUFJLGFBQU8sQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFO1lBQy9CLFdBQVc7WUFDWCxrQkFBa0I7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTztRQUNQLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLHFCQUFxQixDQUFDLDBCQUEwQixFQUFFO1lBQzFFLG9CQUFvQixFQUFFO2dCQUNwQjtvQkFDRSxHQUFHLEVBQUUsR0FBRztvQkFDUixTQUFTLEVBQUU7d0JBQ1Q7NEJBQ0UsU0FBUyxFQUFFLE9BQU87NEJBQ2xCLGFBQWEsRUFBRSxrQkFBa0I7eUJBQ2xDO3FCQUNGO29CQUNELFNBQVMsRUFBRSxJQUFJO29CQUNmLEtBQUssRUFBRSxpQkFBaUI7b0JBQ3hCLE1BQU0sRUFBRSxHQUFHO29CQUNYLElBQUksRUFBRSxLQUFLO29CQUNYLFlBQVksRUFBRTt3QkFDWjs0QkFDRSxhQUFhLEVBQUUsRUFBRTs0QkFDakIsUUFBUSxFQUFFLEtBQUs7eUJBQ2hCO3FCQUNGO29CQUNELE9BQU8sRUFBRTt3QkFDUDs0QkFDRSxTQUFTLEVBQUUsT0FBTzs0QkFDbEIsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsU0FBUyxFQUFFLE9BQU87eUJBQ25CO3FCQUNGO2lCQUNGO2dCQUNEO29CQUNFLFdBQVcsRUFBRTt3QkFDWDs0QkFDRSxJQUFJLEVBQUUsbUJBQW1COzRCQUN6QixLQUFLLEVBQUUseUZBQXlGO3lCQUNqRztxQkFDRjtvQkFDRCxTQUFTLEVBQUUsSUFBSTtvQkFDZixLQUFLLEVBQUUsZ0NBQWdDO29CQUN2QyxnQkFBZ0IsRUFBRTt3QkFDaEIsU0FBUyxFQUFFLFNBQVM7d0JBQ3BCLE9BQU8sRUFBRTs0QkFDUCxlQUFlLEVBQUU7Z0NBQ2YsR0FBRyxFQUFFLHdEQUF3RDs2QkFDOUQ7NEJBQ0QsdUJBQXVCLEVBQUUsa0JBQWtCOzRCQUMzQyxnQkFBZ0IsRUFBRTtnQ0FDaEIsR0FBRyxFQUFFLGFBQWE7NkJBQ25CO3lCQUNGO3FCQUNGO29CQUNELGlCQUFpQixFQUFFLEVBQUU7b0JBQ3JCLElBQUksRUFBRSxrQkFBa0I7b0JBQ3hCLElBQUksRUFBRSxRQUFRO2lCQUNmO2FBQ0Y7WUFDRCxHQUFHLEVBQUUsS0FBSztZQUNWLGdCQUFnQixFQUFFO2dCQUNoQixZQUFZLEVBQUU7b0JBQ1osOENBQThDO29CQUM5QyxLQUFLO2lCQUNOO2FBQ0Y7WUFDRCxNQUFNLEVBQUUseUJBQXlCO1lBQ2pDLE1BQU0sRUFBRSxLQUFLO1lBQ2IsV0FBVyxFQUFFLFFBQVE7WUFDckIsdUJBQXVCLEVBQUU7Z0JBQ3ZCLEtBQUs7Z0JBQ0wsU0FBUzthQUNWO1lBQ0QsV0FBVyxFQUFFO2dCQUNYLFlBQVksRUFBRTtvQkFDWix5Q0FBeUM7b0JBQ3pDLEtBQUs7aUJBQ047YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUZW1wbGF0ZSB9IGZyb20gJ0Bhd3MtY2RrL2Fzc2VydGlvbnMnO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgQ2xvdWR3YXRjaEFnZW50RXh0ZW5zaW9uLCBDb250YWluZXIsIEVudmlyb25tZW50LCBTZXJ2aWNlLCBTZXJ2aWNlRGVzY3JpcHRpb24gfSBmcm9tICcuLi9saWInO1xuXG5kZXNjcmliZSgnY2xvdWR3YXRjaCBhZ2VudCcsICgpID0+IHtcbiAgdGVzdCgnc2hvdWxkIGJlIGFibGUgdG8gYWRkIEFXUyBYLVJheSB0byBhIHNlcnZpY2UnLCAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IG5ldyBFbnZpcm9ubWVudChzdGFjaywgJ3Byb2R1Y3Rpb24nKTtcbiAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBuZXcgU2VydmljZURlc2NyaXB0aW9uKCk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDb250YWluZXIoe1xuICAgICAgY3B1OiAyNTYsXG4gICAgICBtZW1vcnlNaUI6IDUxMixcbiAgICAgIHRyYWZmaWNQb3J0OiA4MCxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCduYXRoYW5wZWNrL25hbWUnKSxcbiAgICB9KSk7XG5cbiAgICBzZXJ2aWNlRGVzY3JpcHRpb24uYWRkKG5ldyBDbG91ZHdhdGNoQWdlbnRFeHRlbnNpb24oKSk7XG5cbiAgICBuZXcgU2VydmljZShzdGFjaywgJ215LXNlcnZpY2UnLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICAgIHNlcnZpY2VEZXNjcmlwdGlvbixcbiAgICB9KTtcblxuICAgIC8vIFRIRU5cbiAgICBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJywge1xuICAgICAgQ29udGFpbmVyRGVmaW5pdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIENwdTogMjU2LFxuICAgICAgICAgIERlcGVuZHNPbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb25kaXRpb246ICdTVEFSVCcsXG4gICAgICAgICAgICAgIENvbnRhaW5lck5hbWU6ICdjbG91ZHdhdGNoLWFnZW50JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBFc3NlbnRpYWw6IHRydWUsXG4gICAgICAgICAgSW1hZ2U6ICduYXRoYW5wZWNrL25hbWUnLFxuICAgICAgICAgIE1lbW9yeTogNTEyLFxuICAgICAgICAgIE5hbWU6ICdhcHAnLFxuICAgICAgICAgIFBvcnRNYXBwaW5nczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBDb250YWluZXJQb3J0OiA4MCxcbiAgICAgICAgICAgICAgUHJvdG9jb2w6ICd0Y3AnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFVsaW1pdHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgSGFyZExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgICBOYW1lOiAnbm9maWxlJyxcbiAgICAgICAgICAgICAgU29mdExpbWl0OiAxMDI0MDAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgRW52aXJvbm1lbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgTmFtZTogJ0NXX0NPTkZJR19DT05URU5UJyxcbiAgICAgICAgICAgICAgVmFsdWU6ICd7XCJsb2dzXCI6e1wibWV0cmljc19jb2xsZWN0ZWRcIjp7XCJlbWZcIjp7fX19LFwibWV0cmljc1wiOntcIm1ldHJpY3NfY29sbGVjdGVkXCI6e1wic3RhdHNkXCI6e319fX0nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIEVzc2VudGlhbDogdHJ1ZSxcbiAgICAgICAgICBJbWFnZTogJ2FtYXpvbi9jbG91ZHdhdGNoLWFnZW50OmxhdGVzdCcsXG4gICAgICAgICAgTG9nQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgTG9nRHJpdmVyOiAnYXdzbG9ncycsXG4gICAgICAgICAgICBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICdhd3Nsb2dzLWdyb3VwJzoge1xuICAgICAgICAgICAgICAgIFJlZjogJ215c2VydmljZXRhc2tkZWZpbml0aW9uY2xvdWR3YXRjaGFnZW50TG9nR3JvdXBERjBDRDY3OScsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICdhd3Nsb2dzLXN0cmVhbS1wcmVmaXgnOiAnY2xvdWR3YXRjaC1hZ2VudCcsXG4gICAgICAgICAgICAgICdhd3Nsb2dzLXJlZ2lvbic6IHtcbiAgICAgICAgICAgICAgICBSZWY6ICdBV1M6OlJlZ2lvbicsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgTWVtb3J5UmVzZXJ2YXRpb246IDUwLFxuICAgICAgICAgIE5hbWU6ICdjbG91ZHdhdGNoLWFnZW50JyxcbiAgICAgICAgICBVc2VyOiAnMDoxMzM4JyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBDcHU6ICcyNTYnLFxuICAgICAgRXhlY3V0aW9uUm9sZUFybjoge1xuICAgICAgICAnRm46OkdldEF0dCc6IFtcbiAgICAgICAgICAnbXlzZXJ2aWNldGFza2RlZmluaXRpb25FeGVjdXRpb25Sb2xlMENFNzRBRDAnLFxuICAgICAgICAgICdBcm4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIEZhbWlseTogJ215c2VydmljZXRhc2tkZWZpbml0aW9uJyxcbiAgICAgIE1lbW9yeTogJzUxMicsXG4gICAgICBOZXR3b3JrTW9kZTogJ2F3c3ZwYycsXG4gICAgICBSZXF1aXJlc0NvbXBhdGliaWxpdGllczogW1xuICAgICAgICAnRUMyJyxcbiAgICAgICAgJ0ZBUkdBVEUnLFxuICAgICAgXSxcbiAgICAgIFRhc2tSb2xlQXJuOiB7XG4gICAgICAgICdGbjo6R2V0QXR0JzogW1xuICAgICAgICAgICdteXNlcnZpY2V0YXNrZGVmaW5pdGlvblRhc2tSb2xlOTJBQ0Q5MDMnLFxuICAgICAgICAgICdBcm4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG59KTsiXX0=