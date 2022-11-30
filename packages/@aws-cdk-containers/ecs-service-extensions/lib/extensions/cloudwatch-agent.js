"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudwatchAgentExtension = void 0;
const ecs = require("@aws-cdk/aws-ecs");
const iam = require("@aws-cdk/aws-iam");
const extension_interfaces_1 = require("./extension-interfaces");
const CLOUDWATCH_AGENT_IMAGE = 'amazon/cloudwatch-agent:latest';
/**
 * This extension adds a CloudWatch agent to the task definition and
 * configures the task to be able to publish metrics to CloudWatch.
 */
class CloudwatchAgentExtension extends extension_interfaces_1.ServiceExtension {
    constructor() {
        super('cloudwatchAgent');
        this.CW_CONFIG_CONTENT = {
            logs: {
                metrics_collected: {
                    emf: {},
                },
            },
            metrics: {
                metrics_collected: {
                    statsd: {},
                },
            },
        };
    }
    prehook(service, scope) {
        this.parentService = service;
        this.scope = scope;
    }
    useTaskDefinition(taskDefinition) {
        // Add the CloudWatch Agent to this task
        this.container = taskDefinition.addContainer('cloudwatch-agent', {
            image: ecs.ContainerImage.fromRegistry(CLOUDWATCH_AGENT_IMAGE),
            environment: {
                CW_CONFIG_CONTENT: JSON.stringify(this.CW_CONFIG_CONTENT),
            },
            logging: new ecs.AwsLogDriver({ streamPrefix: 'cloudwatch-agent' }),
            user: '0:1338',
            memoryReservationMiB: 50,
        });
        // Add permissions that allow the cloudwatch agent to publish metrics
        new iam.Policy(this.scope, `${this.parentService.id}-publish-metrics`, {
            roles: [taskDefinition.taskRole],
            statements: [
                new iam.PolicyStatement({
                    resources: ['*'],
                    actions: ['cloudwatch:PutMetricData'],
                }),
            ],
        });
    }
    resolveContainerDependencies() {
        if (!this.container) {
            throw new Error('The container dependency hook was called before the container was created');
        }
        const appmeshextension = this.parentService.serviceDescription.get('appmesh');
        if (appmeshextension && appmeshextension.container) {
            this.container.addContainerDependencies({
                container: appmeshextension.container,
                condition: ecs.ContainerDependencyCondition.HEALTHY,
            });
        }
    }
}
exports.CloudwatchAgentExtension = CloudwatchAgentExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvdWR3YXRjaC1hZ2VudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsb3Vkd2F0Y2gtYWdlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUd4QyxpRUFBMEQ7QUFFMUQsTUFBTSxzQkFBc0IsR0FBRyxnQ0FBZ0MsQ0FBQztBQUVoRTs7O0dBR0c7QUFDSCxNQUFhLHdCQUF5QixTQUFRLHVDQUFnQjtJQWM1RDtRQUNFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBZG5CLHNCQUFpQixHQUFHO1lBQzFCLElBQUksRUFBRTtnQkFDSixpQkFBaUIsRUFBRTtvQkFDakIsR0FBRyxFQUFFLEVBQUU7aUJBQ1I7YUFDRjtZQUNELE9BQU8sRUFBRTtnQkFDUCxpQkFBaUIsRUFBRTtvQkFDakIsTUFBTSxFQUFFLEVBQUU7aUJBQ1g7YUFDRjtTQUNGLENBQUM7SUFJRixDQUFDO0lBRU0sT0FBTyxDQUFDLE9BQWdCLEVBQUUsS0FBZ0I7UUFDL0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUM7UUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVNLGlCQUFpQixDQUFDLGNBQWtDO1FBQ3pELHdDQUF3QztRQUN4QyxJQUFJLENBQUMsU0FBUyxHQUFHLGNBQWMsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLEVBQUU7WUFDL0QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLHNCQUFzQixDQUFDO1lBQzlELFdBQVcsRUFBRTtnQkFDWCxpQkFBaUIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzthQUMxRDtZQUNELE9BQU8sRUFBRSxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztZQUNuRSxJQUFJLEVBQUUsUUFBUTtZQUNkLG9CQUFvQixFQUFFLEVBQUU7U0FDekIsQ0FBQyxDQUFDO1FBRUgscUVBQXFFO1FBQ3JFLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGtCQUFrQixFQUFFO1lBQ3JFLEtBQUssRUFBRSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7WUFDaEMsVUFBVSxFQUFFO2dCQUNWLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztvQkFDdEIsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNoQixPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQztpQkFDdEMsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLDRCQUE0QjtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLDJFQUEyRSxDQUFDLENBQUM7U0FDOUY7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlFLElBQUksZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsU0FBUyxFQUFFO1lBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUM7Z0JBQ3RDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO2dCQUNyQyxTQUFTLEVBQUUsR0FBRyxDQUFDLDRCQUE0QixDQUFDLE9BQU87YUFDcEQsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBQ0Y7QUE1REQsNERBNERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZWNzIGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ0Bhd3MtY2RrL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBTZXJ2aWNlIH0gZnJvbSAnLi4vc2VydmljZSc7XG5pbXBvcnQgeyBTZXJ2aWNlRXh0ZW5zaW9uIH0gZnJvbSAnLi9leHRlbnNpb24taW50ZXJmYWNlcyc7XG5cbmNvbnN0IENMT1VEV0FUQ0hfQUdFTlRfSU1BR0UgPSAnYW1hem9uL2Nsb3Vkd2F0Y2gtYWdlbnQ6bGF0ZXN0JztcblxuLyoqXG4gKiBUaGlzIGV4dGVuc2lvbiBhZGRzIGEgQ2xvdWRXYXRjaCBhZ2VudCB0byB0aGUgdGFzayBkZWZpbml0aW9uIGFuZFxuICogY29uZmlndXJlcyB0aGUgdGFzayB0byBiZSBhYmxlIHRvIHB1Ymxpc2ggbWV0cmljcyB0byBDbG91ZFdhdGNoLlxuICovXG5leHBvcnQgY2xhc3MgQ2xvdWR3YXRjaEFnZW50RXh0ZW5zaW9uIGV4dGVuZHMgU2VydmljZUV4dGVuc2lvbiB7XG4gIHByaXZhdGUgQ1dfQ09ORklHX0NPTlRFTlQgPSB7XG4gICAgbG9nczoge1xuICAgICAgbWV0cmljc19jb2xsZWN0ZWQ6IHtcbiAgICAgICAgZW1mOiB7fSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBtZXRyaWNzOiB7XG4gICAgICBtZXRyaWNzX2NvbGxlY3RlZDoge1xuICAgICAgICBzdGF0c2Q6IHt9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCdjbG91ZHdhdGNoQWdlbnQnKTtcbiAgfVxuXG4gIHB1YmxpYyBwcmVob29rKHNlcnZpY2U6IFNlcnZpY2UsIHNjb3BlOiBDb25zdHJ1Y3QpIHtcbiAgICB0aGlzLnBhcmVudFNlcnZpY2UgPSBzZXJ2aWNlO1xuICAgIHRoaXMuc2NvcGUgPSBzY29wZTtcbiAgfVxuXG4gIHB1YmxpYyB1c2VUYXNrRGVmaW5pdGlvbih0YXNrRGVmaW5pdGlvbjogZWNzLlRhc2tEZWZpbml0aW9uKSB7XG4gICAgLy8gQWRkIHRoZSBDbG91ZFdhdGNoIEFnZW50IHRvIHRoaXMgdGFza1xuICAgIHRoaXMuY29udGFpbmVyID0gdGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdjbG91ZHdhdGNoLWFnZW50Jywge1xuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoQ0xPVURXQVRDSF9BR0VOVF9JTUFHRSksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBDV19DT05GSUdfQ09OVEVOVDogSlNPTi5zdHJpbmdpZnkodGhpcy5DV19DT05GSUdfQ09OVEVOVCksXG4gICAgICB9LFxuICAgICAgbG9nZ2luZzogbmV3IGVjcy5Bd3NMb2dEcml2ZXIoeyBzdHJlYW1QcmVmaXg6ICdjbG91ZHdhdGNoLWFnZW50JyB9KSxcbiAgICAgIHVzZXI6ICcwOjEzMzgnLCAvLyBFbnN1cmUgdGhhdCBDbG91ZFdhdGNoIGFnZW50IG91dGJvdW5kIHRyYWZmaWMgZG9lc24ndCBnbyB0aHJvdWdoIHByb3h5XG4gICAgICBtZW1vcnlSZXNlcnZhdGlvbk1pQjogNTAsXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgcGVybWlzc2lvbnMgdGhhdCBhbGxvdyB0aGUgY2xvdWR3YXRjaCBhZ2VudCB0byBwdWJsaXNoIG1ldHJpY3NcbiAgICBuZXcgaWFtLlBvbGljeSh0aGlzLnNjb3BlLCBgJHt0aGlzLnBhcmVudFNlcnZpY2UuaWR9LXB1Ymxpc2gtbWV0cmljc2AsIHtcbiAgICAgIHJvbGVzOiBbdGFza0RlZmluaXRpb24udGFza1JvbGVdLFxuICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YSddLFxuICAgICAgICB9KSxcbiAgICAgIF0sXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgcmVzb2x2ZUNvbnRhaW5lckRlcGVuZGVuY2llcygpIHtcbiAgICBpZiAoIXRoaXMuY29udGFpbmVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBjb250YWluZXIgZGVwZW5kZW5jeSBob29rIHdhcyBjYWxsZWQgYmVmb3JlIHRoZSBjb250YWluZXIgd2FzIGNyZWF0ZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBhcHBtZXNoZXh0ZW5zaW9uID0gdGhpcy5wYXJlbnRTZXJ2aWNlLnNlcnZpY2VEZXNjcmlwdGlvbi5nZXQoJ2FwcG1lc2gnKTtcbiAgICBpZiAoYXBwbWVzaGV4dGVuc2lvbiAmJiBhcHBtZXNoZXh0ZW5zaW9uLmNvbnRhaW5lcikge1xuICAgICAgdGhpcy5jb250YWluZXIuYWRkQ29udGFpbmVyRGVwZW5kZW5jaWVzKHtcbiAgICAgICAgY29udGFpbmVyOiBhcHBtZXNoZXh0ZW5zaW9uLmNvbnRhaW5lcixcbiAgICAgICAgY29uZGl0aW9uOiBlY3MuQ29udGFpbmVyRGVwZW5kZW5jeUNvbmRpdGlvbi5IRUFMVEhZLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG4iXX0=