"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireLensExtension = exports.FirelensMutatingHook = void 0;
const ecs = require("@aws-cdk/aws-ecs");
const awslogs = require("@aws-cdk/aws-logs");
const cdk = require("@aws-cdk/core");
const extension_interfaces_1 = require("./extension-interfaces");
/**
 * This hook modifies the application container's settings so that
 * it routes logs using FireLens.
 */
class FirelensMutatingHook extends extension_interfaces_1.ContainerMutatingHook {
    constructor(props) {
        super();
        this.parentService = props.parentService;
        this.logGroup = props.logGroup;
    }
    mutateContainerDefinition(props) {
        return {
            ...props,
            logging: ecs.LogDrivers.firelens({
                options: {
                    Name: 'cloudwatch',
                    region: cdk.Stack.of(this.parentService).region,
                    log_group_name: this.logGroup.logGroupName,
                    log_stream_prefix: `${this.parentService.id}/`,
                },
            }),
        };
    }
}
exports.FirelensMutatingHook = FirelensMutatingHook;
/**
 * This extension adds a FluentBit log router to the task definition
 * and does all the configuration necessarily to enable log routing
 * for the task using FireLens.
 */
class FireLensExtension extends extension_interfaces_1.ServiceExtension {
    constructor() {
        super('firelens');
    }
    prehook(service, scope) {
        this.parentService = service;
        // Create a log group for the service, into which FireLens
        // will route the service's logs
        this.logGroup = new awslogs.LogGroup(scope, `${service.id}-logs`, {
            logGroupName: `${service.id}-logs`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: awslogs.RetentionDays.ONE_WEEK,
        });
    }
    // Add hooks to the main application extension so that it is modified to
    // have logging properties that enable sending logs via the
    // Firelens log router container
    addHooks() {
        const container = this.parentService.serviceDescription.get('service-container');
        if (!container) {
            throw new Error('Firelens extension requires an application extension');
        }
        container.addContainerMutatingHook(new FirelensMutatingHook({
            parentService: this.parentService,
            logGroup: this.logGroup,
        }));
    }
    useTaskDefinition(taskDefinition) {
        // Manually add a firelens log router, so that we can manually manage the dependencies
        // to ensure that the Firelens log router depends on the Envoy proxy
        this.container = taskDefinition.addFirelensLogRouter('firelens', {
            image: ecs.obtainDefaultFluentBitECRImage(taskDefinition, {
                logDriver: 'awsfirelens',
                options: {
                    Name: 'cloudwatch',
                },
            }),
            firelensConfig: {
                type: ecs.FirelensLogRouterType.FLUENTBIT,
            },
            logging: new ecs.AwsLogDriver({ streamPrefix: 'firelens' }),
            memoryReservationMiB: 50,
            user: '0:1338',
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
exports.FireLensExtension = FireLensExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlyZWxlbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaXJlbGVucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3Q0FBd0M7QUFDeEMsNkNBQTZDO0FBQzdDLHFDQUFxQztBQUlyQyxpRUFBaUY7QUFrQmpGOzs7R0FHRztBQUNILE1BQWEsb0JBQXFCLFNBQVEsNENBQXFCO0lBSTdELFlBQVksS0FBb0I7UUFDOUIsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUM7UUFDekMsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO0lBQ2pDLENBQUM7SUFFTSx5QkFBeUIsQ0FBQyxLQUFxQztRQUNwRSxPQUFPO1lBQ0wsR0FBRyxLQUFLO1lBRVIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUMvQixPQUFPLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTTtvQkFDL0MsY0FBYyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWTtvQkFDMUMsaUJBQWlCLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsR0FBRztpQkFDL0M7YUFDRixDQUFDO1NBQytCLENBQUM7SUFDdEMsQ0FBQztDQUNGO0FBeEJELG9EQXdCQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFhLGlCQUFrQixTQUFRLHVDQUFnQjtJQUdyRDtRQUNFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwQixDQUFDO0lBRU0sT0FBTyxDQUFDLE9BQWdCLEVBQUUsS0FBZ0I7UUFDL0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUM7UUFFN0IsMERBQTBEO1FBQzFELGdDQUFnQztRQUNoQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUU7WUFDaEUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsT0FBTztZQUNsQyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLFNBQVMsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVE7U0FDMUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELHdFQUF3RTtJQUN4RSwyREFBMkQ7SUFDM0QsZ0NBQWdDO0lBQ3pCLFFBQVE7UUFDYixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBYyxDQUFDO1FBRTlGLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLHNEQUFzRCxDQUFDLENBQUM7U0FDekU7UUFFRCxTQUFTLENBQUMsd0JBQXdCLENBQUMsSUFBSSxvQkFBb0IsQ0FBQztZQUMxRCxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDakMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1NBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztJQUVNLGlCQUFpQixDQUFDLGNBQWtDO1FBQ3pELHNGQUFzRjtRQUN0RixvRUFBb0U7UUFDcEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQy9ELEtBQUssRUFBRSxHQUFHLENBQUMsOEJBQThCLENBQUMsY0FBYyxFQUFFO2dCQUN4RCxTQUFTLEVBQUUsYUFBYTtnQkFDeEIsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxZQUFZO2lCQUNuQjthQUNGLENBQUM7WUFDRixjQUFjLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTO2FBQzFDO1lBQ0QsT0FBTyxFQUFFLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsQ0FBQztZQUMzRCxvQkFBb0IsRUFBRSxFQUFFO1lBQ3hCLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLDRCQUE0QjtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLDJFQUEyRSxDQUFDLENBQUM7U0FDOUY7UUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlFLElBQUksZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsU0FBUyxFQUFFO1lBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUM7Z0JBQ3RDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO2dCQUNyQyxTQUFTLEVBQUUsR0FBRyxDQUFDLDRCQUE0QixDQUFDLE9BQU87YUFDcEQsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0NBQ0Y7QUFuRUQsOENBbUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZWNzIGZyb20gJ0Bhd3MtY2RrL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgYXdzbG9ncyBmcm9tICdAYXdzLWNkay9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlJztcbmltcG9ydCB7IENvbnRhaW5lciB9IGZyb20gJy4vY29udGFpbmVyJztcbmltcG9ydCB7IENvbnRhaW5lck11dGF0aW5nSG9vaywgU2VydmljZUV4dGVuc2lvbiB9IGZyb20gJy4vZXh0ZW5zaW9uLWludGVyZmFjZXMnO1xuXG4vKipcbiAqIFNldHRpbmdzIGZvciB0aGUgaG9vayB3aGljaCBtdXRhdGVzIHRoZSBhcHBsaWNhdGlvbiBjb250YWluZXJcbiAqIHRvIHJvdXRlIGxvZ3MgdGhyb3VnaCBGaXJlTGVucy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaXJlbGVuc1Byb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBwYXJlbnQgc2VydmljZSB0aGF0IGlzIGJlaW5nIG11dGF0ZWQuXG4gICAqL1xuICByZWFkb25seSBwYXJlbnRTZXJ2aWNlOiBTZXJ2aWNlO1xuXG4gIC8qKlxuICAgKiBUaGUgbG9nIGdyb3VwIGludG8gd2hpY2ggbG9ncyBzaG91bGQgYmUgcm91dGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgbG9nR3JvdXA6IGF3c2xvZ3MuTG9nR3JvdXA7XG59XG5cbi8qKlxuICogVGhpcyBob29rIG1vZGlmaWVzIHRoZSBhcHBsaWNhdGlvbiBjb250YWluZXIncyBzZXR0aW5ncyBzbyB0aGF0XG4gKiBpdCByb3V0ZXMgbG9ncyB1c2luZyBGaXJlTGVucy5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpcmVsZW5zTXV0YXRpbmdIb29rIGV4dGVuZHMgQ29udGFpbmVyTXV0YXRpbmdIb29rIHtcbiAgcHJpdmF0ZSBwYXJlbnRTZXJ2aWNlOiBTZXJ2aWNlO1xuICBwcml2YXRlIGxvZ0dyb3VwOiBhd3Nsb2dzLkxvZ0dyb3VwO1xuXG4gIGNvbnN0cnVjdG9yKHByb3BzOiBGaXJlbGVuc1Byb3BzKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnBhcmVudFNlcnZpY2UgPSBwcm9wcy5wYXJlbnRTZXJ2aWNlO1xuICAgIHRoaXMubG9nR3JvdXAgPSBwcm9wcy5sb2dHcm91cDtcbiAgfVxuXG4gIHB1YmxpYyBtdXRhdGVDb250YWluZXJEZWZpbml0aW9uKHByb3BzOiBlY3MuQ29udGFpbmVyRGVmaW5pdGlvbk9wdGlvbnMpOiBlY3MuQ29udGFpbmVyRGVmaW5pdGlvbk9wdGlvbnMge1xuICAgIHJldHVybiB7XG4gICAgICAuLi5wcm9wcyxcblxuICAgICAgbG9nZ2luZzogZWNzLkxvZ0RyaXZlcnMuZmlyZWxlbnMoe1xuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgTmFtZTogJ2Nsb3Vkd2F0Y2gnLFxuICAgICAgICAgIHJlZ2lvbjogY2RrLlN0YWNrLm9mKHRoaXMucGFyZW50U2VydmljZSkucmVnaW9uLFxuICAgICAgICAgIGxvZ19ncm91cF9uYW1lOiB0aGlzLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSxcbiAgICAgICAgICBsb2dfc3RyZWFtX3ByZWZpeDogYCR7dGhpcy5wYXJlbnRTZXJ2aWNlLmlkfS9gLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgfSBhcyBlY3MuQ29udGFpbmVyRGVmaW5pdGlvbk9wdGlvbnM7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGlzIGV4dGVuc2lvbiBhZGRzIGEgRmx1ZW50Qml0IGxvZyByb3V0ZXIgdG8gdGhlIHRhc2sgZGVmaW5pdGlvblxuICogYW5kIGRvZXMgYWxsIHRoZSBjb25maWd1cmF0aW9uIG5lY2Vzc2FyaWx5IHRvIGVuYWJsZSBsb2cgcm91dGluZ1xuICogZm9yIHRoZSB0YXNrIHVzaW5nIEZpcmVMZW5zLlxuICovXG5leHBvcnQgY2xhc3MgRmlyZUxlbnNFeHRlbnNpb24gZXh0ZW5kcyBTZXJ2aWNlRXh0ZW5zaW9uIHtcbiAgcHJpdmF0ZSBsb2dHcm91cCE6IGF3c2xvZ3MuTG9nR3JvdXA7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoJ2ZpcmVsZW5zJyk7XG4gIH1cblxuICBwdWJsaWMgcHJlaG9vayhzZXJ2aWNlOiBTZXJ2aWNlLCBzY29wZTogQ29uc3RydWN0KSB7XG4gICAgdGhpcy5wYXJlbnRTZXJ2aWNlID0gc2VydmljZTtcblxuICAgIC8vIENyZWF0ZSBhIGxvZyBncm91cCBmb3IgdGhlIHNlcnZpY2UsIGludG8gd2hpY2ggRmlyZUxlbnNcbiAgICAvLyB3aWxsIHJvdXRlIHRoZSBzZXJ2aWNlJ3MgbG9nc1xuICAgIHRoaXMubG9nR3JvdXAgPSBuZXcgYXdzbG9ncy5Mb2dHcm91cChzY29wZSwgYCR7c2VydmljZS5pZH0tbG9nc2AsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYCR7c2VydmljZS5pZH0tbG9nc2AsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgcmV0ZW50aW9uOiBhd3Nsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgfSk7XG4gIH1cblxuICAvLyBBZGQgaG9va3MgdG8gdGhlIG1haW4gYXBwbGljYXRpb24gZXh0ZW5zaW9uIHNvIHRoYXQgaXQgaXMgbW9kaWZpZWQgdG9cbiAgLy8gaGF2ZSBsb2dnaW5nIHByb3BlcnRpZXMgdGhhdCBlbmFibGUgc2VuZGluZyBsb2dzIHZpYSB0aGVcbiAgLy8gRmlyZWxlbnMgbG9nIHJvdXRlciBjb250YWluZXJcbiAgcHVibGljIGFkZEhvb2tzKCkge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMucGFyZW50U2VydmljZS5zZXJ2aWNlRGVzY3JpcHRpb24uZ2V0KCdzZXJ2aWNlLWNvbnRhaW5lcicpIGFzIENvbnRhaW5lcjtcblxuICAgIGlmICghY29udGFpbmVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcmVsZW5zIGV4dGVuc2lvbiByZXF1aXJlcyBhbiBhcHBsaWNhdGlvbiBleHRlbnNpb24nKTtcbiAgICB9XG5cbiAgICBjb250YWluZXIuYWRkQ29udGFpbmVyTXV0YXRpbmdIb29rKG5ldyBGaXJlbGVuc011dGF0aW5nSG9vayh7XG4gICAgICBwYXJlbnRTZXJ2aWNlOiB0aGlzLnBhcmVudFNlcnZpY2UsXG4gICAgICBsb2dHcm91cDogdGhpcy5sb2dHcm91cCxcbiAgICB9KSk7XG4gIH1cblxuICBwdWJsaWMgdXNlVGFza0RlZmluaXRpb24odGFza0RlZmluaXRpb246IGVjcy5UYXNrRGVmaW5pdGlvbikge1xuICAgIC8vIE1hbnVhbGx5IGFkZCBhIGZpcmVsZW5zIGxvZyByb3V0ZXIsIHNvIHRoYXQgd2UgY2FuIG1hbnVhbGx5IG1hbmFnZSB0aGUgZGVwZW5kZW5jaWVzXG4gICAgLy8gdG8gZW5zdXJlIHRoYXQgdGhlIEZpcmVsZW5zIGxvZyByb3V0ZXIgZGVwZW5kcyBvbiB0aGUgRW52b3kgcHJveHlcbiAgICB0aGlzLmNvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZEZpcmVsZW5zTG9nUm91dGVyKCdmaXJlbGVucycsIHtcbiAgICAgIGltYWdlOiBlY3Mub2J0YWluRGVmYXVsdEZsdWVudEJpdEVDUkltYWdlKHRhc2tEZWZpbml0aW9uLCB7XG4gICAgICAgIGxvZ0RyaXZlcjogJ2F3c2ZpcmVsZW5zJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIE5hbWU6ICdjbG91ZHdhdGNoJyxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgICAgZmlyZWxlbnNDb25maWc6IHtcbiAgICAgICAgdHlwZTogZWNzLkZpcmVsZW5zTG9nUm91dGVyVHlwZS5GTFVFTlRCSVQsXG4gICAgICB9LFxuICAgICAgbG9nZ2luZzogbmV3IGVjcy5Bd3NMb2dEcml2ZXIoeyBzdHJlYW1QcmVmaXg6ICdmaXJlbGVucycgfSksXG4gICAgICBtZW1vcnlSZXNlcnZhdGlvbk1pQjogNTAsXG4gICAgICB1c2VyOiAnMDoxMzM4JywgLy8gR2l2ZSBGaXJlbGVucyBhIGdyb3VwIElEIHRoYXQgYWxsb3dzIGl0cyBvdXRib3VuZCBsb2dzIHRvIGJ5cGFzcyBFbnZveVxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIHJlc29sdmVDb250YWluZXJEZXBlbmRlbmNpZXMoKSB7XG4gICAgaWYgKCF0aGlzLmNvbnRhaW5lcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgY29udGFpbmVyIGRlcGVuZGVuY3kgaG9vayB3YXMgY2FsbGVkIGJlZm9yZSB0aGUgY29udGFpbmVyIHdhcyBjcmVhdGVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgYXBwbWVzaGV4dGVuc2lvbiA9IHRoaXMucGFyZW50U2VydmljZS5zZXJ2aWNlRGVzY3JpcHRpb24uZ2V0KCdhcHBtZXNoJyk7XG4gICAgaWYgKGFwcG1lc2hleHRlbnNpb24gJiYgYXBwbWVzaGV4dGVuc2lvbi5jb250YWluZXIpIHtcbiAgICAgIHRoaXMuY29udGFpbmVyLmFkZENvbnRhaW5lckRlcGVuZGVuY2llcyh7XG4gICAgICAgIGNvbnRhaW5lcjogYXBwbWVzaGV4dGVuc2lvbi5jb250YWluZXIsXG4gICAgICAgIGNvbmRpdGlvbjogZWNzLkNvbnRhaW5lckRlcGVuZGVuY3lDb25kaXRpb24uSEVBTFRIWSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19