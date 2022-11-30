"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = void 0;
const ecs = require("@aws-cdk/aws-ecs");
const awslogs = require("@aws-cdk/aws-logs");
const cdk = require("@aws-cdk/core");
const cxapi = require("@aws-cdk/cx-api");
const constructs_1 = require("constructs");
const extension_interfaces_1 = require("./extension-interfaces");
/**
 * The main container of a service. This is generally the container
 * which runs your application business logic. Other extensions will attach
 * sidecars alongside this main container.
 */
class Container extends extension_interfaces_1.ServiceExtension {
    constructor(props) {
        super('service-container');
        this.props = props;
        this.trafficPort = props.trafficPort;
        this.logGroup = props.logGroup;
    }
    prehook(service, scope) {
        this.parentService = service;
        this.scope = scope;
    }
    // This hook sets the overall task resource requirements to the
    // resource requirements of the application itself.
    modifyTaskDefinitionProps(props) {
        return {
            ...props,
            cpu: this.props.cpu.toString(),
            memoryMiB: this.props.memoryMiB.toString(),
        };
    }
    // This hook adds the application container to the task definition.
    useTaskDefinition(taskDefinition) {
        let containerProps = {
            image: this.props.image,
            cpu: Number(this.props.cpu),
            memoryLimitMiB: Number(this.props.memoryMiB),
            environment: this.props.environment,
        };
        // Let other extensions mutate the container definition. This is
        // used by extensions which want to add environment variables, modify
        // logging parameters, etc.
        this.containerMutatingHooks.forEach((hookProvider) => {
            containerProps = hookProvider.mutateContainerDefinition(containerProps);
        });
        // If no observability extensions have been added to the service description then we can configure the `awslogs` log driver
        if (!containerProps.logging) {
            // Create a log group for the service if one is not provided by the user (only if feature flag is set)
            if (!this.logGroup && constructs_1.Node.of(this.parentService).tryGetContext(cxapi.ECS_SERVICE_EXTENSIONS_ENABLE_DEFAULT_LOG_DRIVER)) {
                this.logGroup = new awslogs.LogGroup(this.scope, `${this.parentService.id}-logs`, {
                    logGroupName: `${this.parentService.id}-logs`,
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                    retention: awslogs.RetentionDays.ONE_MONTH,
                });
            }
            if (this.logGroup) {
                containerProps = {
                    ...containerProps,
                    logging: new ecs.AwsLogDriver({
                        streamPrefix: this.parentService.id,
                        logGroup: this.logGroup,
                    }),
                };
            }
        }
        else {
            if (this.logGroup) {
                throw Error(`Log configuration already specified. You cannot provide a log group for the application container of service '${this.parentService.id}' while also adding log configuration separately using service extensions.`);
            }
        }
        this.container = taskDefinition.addContainer('app', containerProps);
        // Create a port mapping for the container
        this.container.addPortMappings({
            containerPort: this.trafficPort,
        });
        // Raise the ulimits for this main application container
        // so that it can handle more concurrent requests
        this.container.addUlimits({
            softLimit: 1024000,
            hardLimit: 1024000,
            name: ecs.UlimitName.NOFILE,
        });
    }
    resolveContainerDependencies() {
        if (!this.container) {
            throw new Error('The container dependency hook was called before the container was created');
        }
        const firelens = this.parentService.serviceDescription.get('firelens');
        if (firelens && firelens.container) {
            this.container.addContainerDependencies({
                container: firelens.container,
                condition: ecs.ContainerDependencyCondition.START,
            });
        }
        const appmeshextension = this.parentService.serviceDescription.get('appmesh');
        if (appmeshextension && appmeshextension.container) {
            this.container.addContainerDependencies({
                container: appmeshextension.container,
                condition: ecs.ContainerDependencyCondition.HEALTHY,
            });
        }
        const cloudwatchextension = this.parentService.serviceDescription.get('cloudwatchAgent');
        if (cloudwatchextension && cloudwatchextension.container) {
            this.container.addContainerDependencies({
                container: cloudwatchextension.container,
                condition: ecs.ContainerDependencyCondition.START,
            });
        }
        const xrayextension = this.parentService.serviceDescription.get('xray');
        if (xrayextension && xrayextension.container) {
            this.container.addContainerDependencies({
                container: xrayextension.container,
                condition: ecs.ContainerDependencyCondition.HEALTHY,
            });
        }
    }
}
exports.Container = Container;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGFpbmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29udGFpbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdDQUF3QztBQUN4Qyw2Q0FBNkM7QUFDN0MscUNBQXFDO0FBQ3JDLHlDQUF5QztBQUN6QywyQ0FBNkM7QUFFN0MsaUVBQTBEO0FBMkMxRDs7OztHQUlHO0FBQ0gsTUFBYSxTQUFVLFNBQVEsdUNBQWdCO0lBZ0I3QyxZQUFZLEtBQThCO1FBQ3hDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7SUFDakMsQ0FBQztJQUVNLE9BQU8sQ0FBQyxPQUFnQixFQUFFLEtBQWdCO1FBQy9DLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDO1FBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLENBQUM7SUFFRCwrREFBK0Q7SUFDL0QsbURBQW1EO0lBQzVDLHlCQUF5QixDQUFDLEtBQThCO1FBQzdELE9BQU87WUFDTCxHQUFHLEtBQUs7WUFDUixHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO1lBQzlCLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7U0FDaEIsQ0FBQztJQUMvQixDQUFDO0lBRUQsbUVBQW1FO0lBQzVELGlCQUFpQixDQUFDLGNBQWtDO1FBQ3pELElBQUksY0FBYyxHQUFHO1lBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUs7WUFDdkIsR0FBRyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUMzQixjQUFj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UyxDQUFDLENBQUM7UUFDOUUsSUFBSSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUU7WUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQztnQkFDdEMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLFNBQVM7Z0JBQ3JDLFNBQVMsRUFBRSxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTzthQUNwRCxDQUFDLENBQUM7U0FDSjtRQUVELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN6RixJQUFJLG1CQUFtQixJQUFJLG1CQUFtQixDQUFDLFNBQVMsRUFBRTtZQUN4RCxJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDO2dCQUN0QyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsU0FBUztnQkFDeEMsU0FBUyxFQUFFLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLO2FBQ2xELENBQUMsQ0FBQztTQUNKO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEUsSUFBSSxhQUFhLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRTtZQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDO2dCQUN0QyxTQUFTLEVBQUUsYUFBYSxDQUFDLFNBQVM7Z0JBQ2xDLFNBQVMsRUFBRSxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTzthQUNwRCxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0FDRjtBQXBJRCw4QkFvSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBhd3Nsb2dzIGZyb20gJ0Bhd3MtY2RrL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCAqIGFzIGN4YXBpIGZyb20gJ0Bhd3MtY2RrL2N4LWFwaSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QsIE5vZGUgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlJztcbmltcG9ydCB7IFNlcnZpY2VFeHRlbnNpb24gfSBmcm9tICcuL2V4dGVuc2lvbi1pbnRlcmZhY2VzJztcblxuLyoqXG4gKiBTZXR0aW5nIGZvciB0aGUgbWFpbiBhcHBsaWNhdGlvbiBjb250YWluZXIgb2YgYSBzZXJ2aWNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnRhaW5lckV4dGVuc2lvblByb3BzIHtcbiAgLyoqXG4gICAqIEhvdyBtdWNoIENQVSB0aGUgY29udGFpbmVyIHJlcXVpcmVzLlxuICAgKi9cbiAgcmVhZG9ubHkgY3B1OiBudW1iZXIsXG5cbiAgLyoqXG4gICAqIEhvdyBtdWNoIG1lbW9yeSBpbiBtZWdhYnl0ZXMgdGhlIGNvbnRhaW5lciByZXF1aXJlcy5cbiAgICovXG4gIHJlYWRvbmx5IG1lbW9yeU1pQjogbnVtYmVyLFxuXG4gIC8qKlxuICAgKiBUaGUgaW1hZ2UgdG8gcnVuLlxuICAgKi9cbiAgcmVhZG9ubHkgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZSxcblxuICAvKipcbiAgICogV2hhdCBwb3J0IHRoZSBpbWFnZSBsaXN0ZW4gZm9yIHRyYWZmaWMgb24uXG4gICAqL1xuICByZWFkb25seSB0cmFmZmljUG9ydDogbnVtYmVyLFxuXG4gIC8qKlxuICAgKiBFbnZpcm9ubWVudCB2YXJpYWJsZXMgdG8gcGFzcyBpbnRvIHRoZSBjb250YWluZXIuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm8gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICAgKi9cbiAgcmVhZG9ubHkgZW52aXJvbm1lbnQ/OiB7XG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nLFxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBsb2cgZ3JvdXAgaW50byB3aGljaCBhcHBsaWNhdGlvbiBjb250YWluZXIgbG9ncyBzaG91bGQgYmUgcm91dGVkLlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIEEgbG9nIGdyb3VwIGlzIGF1dG9tYXRpY2FsbHkgY3JlYXRlZCBmb3IgeW91IGlmIHRoZSBgRUNTX1NFUlZJQ0VfRVhURU5TSU9OU19FTkFCTEVfREVGQVVMVF9MT0dfRFJJVkVSYCBmZWF0dXJlIGZsYWcgaXMgc2V0LlxuICAgKi9cbiAgcmVhZG9ubHkgbG9nR3JvdXA/OiBhd3Nsb2dzLklMb2dHcm91cDtcbn1cblxuLyoqXG4gKiBUaGUgbWFpbiBjb250YWluZXIgb2YgYSBzZXJ2aWNlLiBUaGlzIGlzIGdlbmVyYWxseSB0aGUgY29udGFpbmVyXG4gKiB3aGljaCBydW5zIHlvdXIgYXBwbGljYXRpb24gYnVzaW5lc3MgbG9naWMuIE90aGVyIGV4dGVuc2lvbnMgd2lsbCBhdHRhY2hcbiAqIHNpZGVjYXJzIGFsb25nc2lkZSB0aGlzIG1haW4gY29udGFpbmVyLlxuICovXG5leHBvcnQgY2xhc3MgQ29udGFpbmVyIGV4dGVuZHMgU2VydmljZUV4dGVuc2lvbiB7XG4gIC8qKlxuICAgKiBUaGUgcG9ydCBvbiB3aGljaCB0aGUgY29udGFpbmVyIGV4cGVjdHMgdG8gcmVjZWl2ZSBuZXR3b3JrIHRyYWZmaWNcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB0cmFmZmljUG9ydDogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgbG9nIGdyb3VwIGludG8gd2hpY2ggYXBwbGljYXRpb24gY29udGFpbmVyIGxvZ3Mgc2hvdWxkIGJlIHJvdXRlZC5cbiAgICovXG4gIHB1YmxpYyBsb2dHcm91cD86IGF3c2xvZ3MuSUxvZ0dyb3VwO1xuXG4gIC8qKlxuICAgKiBUaGUgc2V0dGluZ3MgZm9yIHRoZSBjb250YWluZXIuXG4gICAqL1xuICBwcml2YXRlIHByb3BzOiBDb250YWluZXJFeHRlbnNpb25Qcm9wcztcblxuICBjb25zdHJ1Y3Rvcihwcm9wczogQ29udGFpbmVyRXh0ZW5zaW9uUHJvcHMpIHtcbiAgICBzdXBlcignc2VydmljZS1jb250YWluZXInKTtcbiAgICB0aGlzLnByb3BzID0gcHJvcHM7XG4gICAgdGhpcy50cmFmZmljUG9ydCA9IHByb3BzLnRyYWZmaWNQb3J0O1xuICAgIHRoaXMubG9nR3JvdXAgPSBwcm9wcy5sb2dHcm91cDtcbiAgfVxuXG4gIHB1YmxpYyBwcmVob29rKHNlcnZpY2U6IFNlcnZpY2UsIHNjb3BlOiBDb25zdHJ1Y3QpIHtcbiAgICB0aGlzLnBhcmVudFNlcnZpY2UgPSBzZXJ2aWNlO1xuICAgIHRoaXMuc2NvcGUgPSBzY29wZTtcbiAgfVxuXG4gIC8vIFRoaXMgaG9vayBzZXRzIHRoZSBvdmVyYWxsIHRhc2sgcmVzb3VyY2UgcmVxdWlyZW1lbnRzIHRvIHRoZVxuICAvLyByZXNvdXJjZSByZXF1aXJlbWVudHMgb2YgdGhlIGFwcGxpY2F0aW9uIGl0c2VsZi5cbiAgcHVibGljIG1vZGlmeVRhc2tEZWZpbml0aW9uUHJvcHMocHJvcHM6IGVjcy5UYXNrRGVmaW5pdGlvblByb3BzKTogZWNzLlRhc2tEZWZpbml0aW9uUHJvcHMge1xuICAgIHJldHVybiB7XG4gICAgICAuLi5wcm9wcyxcbiAgICAgIGNwdTogdGhpcy5wcm9wcy5jcHUudG9TdHJpbmcoKSxcbiAgICAgIG1lbW9yeU1pQjogdGhpcy5wcm9wcy5tZW1vcnlNaUIudG9TdHJpbmcoKSxcbiAgICB9IGFzIGVjcy5UYXNrRGVmaW5pdGlvblByb3BzO1xuICB9XG5cbiAgLy8gVGhpcyBob29rIGFkZHMgdGhlIGFwcGxpY2F0aW9uIGNvbnRhaW5lciB0byB0aGUgdGFzayBkZWZpbml0aW9uLlxuICBwdWJsaWMgdXNlVGFza0RlZmluaXRpb24odGFza0RlZmluaXRpb246IGVjcy5UYXNrRGVmaW5pdGlvbikge1xuICAgIGxldCBjb250YWluZXJQcm9wcyA9IHtcbiAgICAgIGltYWdlOiB0aGlzLnByb3BzLmltYWdlLFxuICAgICAgY3B1OiBOdW1iZXIodGhpcy5wcm9wcy5jcHUpLFxuICAgICAgbWVtb3J5TGltaXRNaUI6IE51bWJlcih0aGlzLnByb3BzLm1lbW9yeU1pQiksXG4gICAgICBlbnZpcm9ubWVudDogdGhpcy5wcm9wcy5lbnZpcm9ubWVudCxcbiAgICB9IGFzIGVjcy5Db250YWluZXJEZWZpbml0aW9uT3B0aW9ucztcblxuICAgIC8vIExldCBvdGhlciBleHRlbnNpb25zIG11dGF0ZSB0aGUgY29udGFpbmVyIGRlZmluaXRpb24uIFRoaXMgaXNcbiAgICAvLyB1c2VkIGJ5IGV4dGVuc2lvbnMgd2hpY2ggd2FudCB0byBhZGQgZW52aXJvbm1lbnQgdmFyaWFibGVzLCBtb2RpZnlcbiAgICAvLyBsb2dnaW5nIHBhcmFtZXRlcnMsIGV0Yy5cbiAgICB0aGlzLmNvbnRhaW5lck11dGF0aW5nSG9va3MuZm9yRWFjaCgoaG9va1Byb3ZpZGVyKSA9PiB7XG4gICAgICBjb250YWluZXJQcm9wcyA9IGhvb2tQcm92aWRlci5tdXRhdGVDb250YWluZXJEZWZpbml0aW9uKGNvbnRhaW5lclByb3BzKTtcbiAgICB9KTtcblxuICAgIC8vIElmIG5vIG9ic2VydmFiaWxpdHkgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIHNlcnZpY2UgZGVzY3JpcHRpb24gdGhlbiB3ZSBjYW4gY29uZmlndXJlIHRoZSBgYXdzbG9nc2AgbG9nIGRyaXZlclxuICAgIGlmICghY29udGFpbmVyUHJvcHMubG9nZ2luZykge1xuICAgICAgLy8gQ3JlYXRlIGEgbG9nIGdyb3VwIGZvciB0aGUgc2VydmljZSBpZiBvbmUgaXMgbm90IHByb3ZpZGVkIGJ5IHRoZSB1c2VyIChvbmx5IGlmIGZlYXR1cmUgZmxhZyBpcyBzZXQpXG4gICAgICBpZiAoIXRoaXMubG9nR3JvdXAgJiYgTm9kZS5vZih0aGlzLnBhcmVudFNlcnZpY2UpLnRyeUdldENvbnRleHQoY3hhcGkuRUNTX1NFUlZJQ0VfRVhURU5TSU9OU19FTkFCTEVfREVGQVVMVF9MT0dfRFJJVkVSKSkge1xuICAgICAgICB0aGlzLmxvZ0dyb3VwID0gbmV3IGF3c2xvZ3MuTG9nR3JvdXAodGhpcy5zY29wZSwgYCR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfS1sb2dzYCwge1xuICAgICAgICAgIGxvZ0dyb3VwTmFtZTogYCR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfS1sb2dzYCxcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICAgIHJldGVudGlvbjogYXdzbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmxvZ0dyb3VwKSB7XG4gICAgICAgIGNvbnRhaW5lclByb3BzID0ge1xuICAgICAgICAgIC4uLmNvbnRhaW5lclByb3BzLFxuICAgICAgICAgIGxvZ2dpbmc6IG5ldyBlY3MuQXdzTG9nRHJpdmVyKHtcbiAgICAgICAgICAgIHN0cmVhbVByZWZpeDogdGhpcy5wYXJlbnRTZXJ2aWNlLmlkLFxuICAgICAgICAgICAgbG9nR3JvdXA6IHRoaXMubG9nR3JvdXAsXG4gICAgICAgICAgfSksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLmxvZ0dyb3VwKSB7XG4gICAgICAgIHRocm93IEVycm9yKGBMb2cgY29uZmlndXJhdGlvbiBhbHJlYWR5IHNwZWNpZmllZC4gWW91IGNhbm5vdCBwcm92aWRlIGEgbG9nIGdyb3VwIGZvciB0aGUgYXBwbGljYXRpb24gY29udGFpbmVyIG9mIHNlcnZpY2UgJyR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfScgd2hpbGUgYWxzbyBhZGRpbmcgbG9nIGNvbmZpZ3VyYXRpb24gc2VwYXJhdGVseSB1c2luZyBzZXJ2aWNlIGV4dGVuc2lvbnMuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuY29udGFpbmVyID0gdGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdhcHAnLCBjb250YWluZXJQcm9wcyk7XG5cbiAgICAvLyBDcmVhdGUgYSBwb3J0IG1hcHBpbmcgZm9yIHRoZSBjb250YWluZXJcbiAgICB0aGlzLmNvbnRhaW5lci5hZGRQb3J0TWFwcGluZ3Moe1xuICAgICAgY29udGFpbmVyUG9ydDogdGhpcy50cmFmZmljUG9ydCxcbiAgICB9KTtcblxuICAgIC8vIFJhaXNlIHRoZSB1bGltaXRzIGZvciB0aGlzIG1haW4gYXBwbGljYXRpb24gY29udGFpbmVyXG4gICAgLy8gc28gdGhhdCBpdCBjYW4gaGFuZGxlIG1vcmUgY29uY3VycmVudCByZXF1ZXN0c1xuICAgIHRoaXMuY29udGFpbmVyLmFkZFVsaW1pdHMoe1xuICAgICAgc29mdExpbWl0OiAxMDI0MDAwLFxuICAgICAgaGFyZExpbWl0OiAxMDI0MDAwLFxuICAgICAgbmFtZTogZWNzLlVsaW1pdE5hbWUuTk9GSUxFLFxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIHJlc29sdmVDb250YWluZXJEZXBlbmRlbmNpZXMoKSB7XG4gICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgY29udGFpbmVyIGRlcGVuZGVuY3kgaG9vayB3YXMgY2FsbGVkIGJlZm9yZSB0aGUgY29udGFpbmVyIHdhcyBjcmVhdGVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgZmlyZWxlbnMgPSB0aGlzLnBhcmVudFNlcnZpY2Uuc2VydmljZURlc2NyaXB0aW9uLmdldCgnZmlyZWxlbnMnKTtcbiAgICBpZiAoZmlyZWxlbnMgJiYgZmlyZWxlbnMuY29udGFpbmVyKSB7XG4gICAgICB0aGlzLmNvbnRhaW5lci5hZGRDb250YWluZXJEZXBlbmRlbmNpZXMoe1xuICAgICAgICBjb250YWluZXI6IGZpcmVsZW5zLmNvbnRhaW5lcixcbiAgICAgICAgY29uZGl0aW9uOiBlY3MuQ29udGFpbmVyRGVwZW5kZW5jeUNvbmRpdGlvbi5TVEFSVCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGFwcG1lc2hleHRlbnNpb24gPSB0aGlzLnBhcmVudFNlcnZpY2Uuc2VydmljZURlc2NyaXB0aW9uLmdldCgnYXBwbWVzaCcpO1xuICAgIGlmIChhcHBtZXNoZXh0ZW5zaW9uICYmIGFwcG1lc2hleHRlbnNpb24uY29udGFpbmVyKSB7XG4gICAgICB0aGlzLmNvbnRhaW5lci5hZGRDb250YWluZXJEZXBlbmRlbmNpZXMoe1xuICAgICAgICBjb250YWluZXI6IGFwcG1lc2hleHRlbnNpb24uY29udGFpbmVyLFxuICAgICAgICBjb25kaXRpb246IGVjcy5Db250YWluZXJEZXBlbmRlbmN5Q29uZGl0aW9uLkhFQUxUSFksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBjbG91ZHdhdGNoZXh0ZW5zaW9uID0gdGhpcy5wYXJlbnRTZXJ2aWNlLnNlcnZpY2VEZXNjcmlwdGlvbi5nZXQoJ2Nsb3Vkd2F0Y2hBZ2VudCcpO1xuICAgIGlmIChjbG91ZHdhdGNoZXh0ZW5zaW9uICYmIGNsb3Vkd2F0Y2hleHRlbnNpb24uY29udGFpbmVyKSB7XG4gICAgICB0aGlzLmNvbnRhaW5lci5hZGRDb250YWluZXJEZXBlbmRlbmNpZXMoe1xuICAgICAgICBjb250YWluZXI6IGNsb3Vkd2F0Y2hleHRlbnNpb24uY29udGFpbmVyLFxuICAgICAgICBjb25kaXRpb246IGVjcy5Db250YWluZXJEZXBlbmRlbmN5Q29uZGl0aW9uLlNUQVJULFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgeHJheWV4dGVuc2lvbiA9IHRoaXMucGFyZW50U2VydmljZS5zZXJ2aWNlRGVzY3JpcHRpb24uZ2V0KCd4cmF5Jyk7XG4gICAgaWYgKHhyYXlleHRlbnNpb24gJiYgeHJheWV4dGVuc2lvbi5jb250YWluZXIpIHtcbiAgICAgIHRoaXMuY29udGFpbmVyLmFkZENvbnRhaW5lckRlcGVuZGVuY2llcyh7XG4gICAgICAgIGNvbnRhaW5lcjogeHJheWV4dGVuc2lvbi5jb250YWluZXIsXG4gICAgICAgIGNvbmRpdGlvbjogZWNzLkNvbnRhaW5lckRlcGVuZGVuY3lDb25kaXRpb24uSEVBTFRIWSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19