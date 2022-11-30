"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Service = void 0;
const ecs = require("@aws-cdk/aws-ecs");
const constructs_1 = require("constructs");
const extension_interfaces_1 = require("./extensions/extension-interfaces");
/**
 * This Service construct serves as a Builder class for an ECS service. It
 * supports various extensions and keeps track of any mutating state, allowing
 * it to build up an ECS service progressively.
 */
class Service extends constructs_1.Construct {
    constructor(scope, id, props) {
        var _a;
        super(scope, id);
        /**
         * The flag to track if auto scaling policies have been configured
         * for the service.
         */
        this.autoScalingPoliciesEnabled = false;
        /**
         * The list of URLs associated with this service.
         */
        this.urls = {};
        this.scope = scope;
        this.id = id;
        this.environment = props.environment;
        this.vpc = props.environment.vpc;
        this.cluster = props.environment.cluster;
        this.capacityType = props.environment.capacityType;
        this.serviceDescription = props.serviceDescription;
        // Check to make sure that the user has actually added a container
        const containerextension = this.serviceDescription.get('service-container');
        if (!containerextension) {
            throw new Error(`Service '${this.id}' must have a Container extension`);
        }
        // First set the scope for all the extensions
        for (const extensions in this.serviceDescription.extensions) {
            if (this.serviceDescription.extensions[extensions]) {
                this.serviceDescription.extensions[extensions].prehook(this, this.scope);
            }
        }
        // At the point of preparation all extensions have been defined on the service
        // so give each extension a chance to now add hooks to other extensions if
        // needed
        for (const extensions in this.serviceDescription.extensions) {
            if (this.serviceDescription.extensions[extensions]) {
                this.serviceDescription.extensions[extensions].addHooks();
            }
        }
        // Give each extension a chance to mutate the task def creation properties
        let taskDefProps = {
            // Default CPU and memory
            cpu: '256',
            memory: '512',
            // Allow user to pre-define the taskRole so that it can be used in resource policies that may
            // be defined before the ECS service exists in a CDK application
            taskRole: props.taskRole,
            // Ensure that the task definition supports both EC2 and Fargate
            compatibility: ecs.Compatibility.EC2_AND_FARGATE,
        };
        for (const extensions in this.serviceDescription.extensions) {
            if (this.serviceDescription.extensions[extensions]) {
                taskDefProps = this.serviceDescription.extensions[extensions].modifyTaskDefinitionProps(taskDefProps);
            }
        }
        // Now that the task definition properties are assembled, create it
        this.taskDefinition = new ecs.TaskDefinition(this.scope, `${this.id}-task-definition`, taskDefProps);
        // Now give each extension a chance to use the task definition
        for (const extensions in this.serviceDescription.extensions) {
            if (this.serviceDescription.extensions[extensions]) {
                this.serviceDescription.extensions[extensions].useTaskDefinition(this.taskDefinition);
            }
        }
        // Now that all containers are created, give each extension a chance
        // to bake its dependency graph
        for (const extensions in this.serviceDescription.extensions) {
            if (this.serviceDescription.extensions[extensions]) {
                this.serviceDescription.extensions[extensions].resolveContainerDependencies();
            }
        }
        // Give each extension a chance to mutate the service props before
        // service creation
        let serviceProps = {
            cluster: this.cluster,
            taskDefinition: this.taskDefinition,
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
            desiredCount: (_a = props.desiredCount) !== null && _a !== void 0 ? _a : 1,
        };
        for (const extensions in this.serviceDescription.extensions) {
            if (this.serviceDescription.extensions[extensions]) {
                serviceProps = this.serviceDescription.extensions[extensions].modifyServiceProps(serviceProps);
            }
        }
        // If a maxHealthyPercent and desired count has been set while minHealthyPercent == 100% then we
        // need to do some failsafe checking to ensure that the maxHealthyPercent
        // actually allows a rolling deploy. Otherwise it is possible to end up with
        // blocked deploys that can take no action because minHealtyhPercent == 100%
        // prevents running, healthy tasks from being stopped, but a low maxHealthyPercent
        // can also prevents new parallel tasks from being started.
        if (serviceProps.maxHealthyPercent && serviceProps.desiredCount && serviceProps.minHealthyPercent && serviceProps.minHealthyPercent == 100) {
            if (serviceProps.desiredCount == 1) {
                // If there is one task then we must allow max percentage to be at
                // least 200% for another replacement task to be added
                serviceProps = {
                    ...serviceProps,
                    maxHealthyPercent: Math.max(200, serviceProps.maxHealthyPercent),
                };
            }
            else if (serviceProps.desiredCount <= 3) {
                // If task count is 2 or 3 then max percent must be at least 150% to
                // allow one replacement task to be launched at a time.
                serviceProps = {
                    ...serviceProps,
                    maxHealthyPercent: Math.max(150, serviceProps.maxHealthyPercent),
                };
            }
            else {
                // For anything higher than 3 tasks set max percent to at least 125%
                // For 4 tasks this will allow exactly one extra replacement task
                // at a time, for any higher task count it will allow 25% of the tasks
                // to be replaced at a time.
                serviceProps = {
                    ...serviceProps,
                    maxHealthyPercent: Math.max(125, serviceProps.maxHealthyPercent),
                };
            }
        }
        // Set desiredCount to `undefined` if auto scaling is configured for the service
        if (props.autoScaleTaskCount || this.autoScalingPoliciesEnabled) {
            serviceProps = {
                ...serviceProps,
                desiredCount: undefined,
            };
        }
        // Now that the service props are determined we can create
        // the service
        if (this.capacityType === extension_interfaces_1.EnvironmentCapacityType.EC2) {
            this.ecsService = new ecs.Ec2Service(this.scope, `${this.id}-service`, serviceProps);
        }
        else if (this.capacityType === extension_interfaces_1.EnvironmentCapacityType.FARGATE) {
            this.ecsService = new ecs.FargateService(this.scope, `${this.id}-service`, serviceProps);
        }
        else {
            throw new Error(`Unknown capacity type for service ${this.id}`);
        }
        // Create the auto scaling target and configure target tracking policies after the service is created
        if (props.autoScaleTaskCount) {
            this.scalableTaskCount = this.ecsService.autoScaleTaskCount({
                maxCapacity: props.autoScaleTaskCount.maxTaskCount,
                minCapacity: props.autoScaleTaskCount.minTaskCount,
            });
            if (props.autoScaleTaskCount.targetCpuUtilization) {
                const targetCpuUtilizationPercent = props.autoScaleTaskCount.targetCpuUtilization;
                this.scalableTaskCount.scaleOnCpuUtilization(`${this.id}-target-cpu-utilization-${targetCpuUtilizationPercent}`, {
                    targetUtilizationPercent: targetCpuUtilizationPercent,
                });
                this.enableAutoScalingPolicy();
            }
            if (props.autoScaleTaskCount.targetMemoryUtilization) {
                const targetMemoryUtilizationPercent = props.autoScaleTaskCount.targetMemoryUtilization;
                this.scalableTaskCount.scaleOnMemoryUtilization(`${this.id}-target-memory-utilization-${targetMemoryUtilizationPercent}`, {
                    targetUtilizationPercent: targetMemoryUtilizationPercent,
                });
                this.enableAutoScalingPolicy();
            }
        }
        // Now give all extensions a chance to use the service
        for (const extensions in this.serviceDescription.extensions) {
            if (this.serviceDescription.extensions[extensions]) {
                this.serviceDescription.extensions[extensions].useService(this.ecsService);
            }
        }
        // Error out if the auto scaling target is created but no scaling policies have been configured
        if (this.scalableTaskCount && !this.autoScalingPoliciesEnabled) {
            throw Error(`The auto scaling target for the service '${this.id}' has been created but no auto scaling policies have been configured.`);
        }
    }
    /**
     * Tell extensions from one service to connect to extensions from
     * another sevice if they have implemented a hook for it.
     *
     * @param service
     */
    connectTo(service, connectToProps = {}) {
        for (const extensions in this.serviceDescription.extensions) {
            if (this.serviceDescription.extensions[extensions]) {
                this.serviceDescription.extensions[extensions].connectToService(service, connectToProps);
            }
        }
    }
    /**
     * This method adds a new URL for the service. This allows extensions to
     * submit a URL for the service. For example, a load balancer might add its
     * URL, or App Mesh can add its DNS name for the service.
     *
     * @param urlName - The identifier name for this URL
     * @param url - The URL itself.
     */
    addURL(urlName, url) {
        this.urls[urlName] = url;
    }
    /**
     * Retrieve a URL for the service. The URL must have previously been
     * stored by one of the URL providing extensions.
     *
     * @param urlName - The URL to look up.
     */
    getURL(urlName) {
        if (!this.urls[urlName]) {
            throw new Error(`Unable to find a URL with name '${urlName}'`);
        }
        return this.urls[urlName];
    }
    /**
     * This helper method is used to set the `autoScalingPoliciesEnabled` attribute
     * whenever an auto scaling policy is configured for the service.
     */
    enableAutoScalingPolicy() {
        this.autoScalingPoliciesEnabled = true;
    }
}
exports.Service = Service;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0Esd0NBQXdDO0FBRXhDLDJDQUF1QztBQUV2Qyw0RUFBMEY7QUE2RTFGOzs7O0dBSUc7QUFDSCxNQUFhLE9BQVEsU0FBUSxzQkFBUztJQThEcEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFtQjs7UUFDM0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQXBCbkI7OztXQUdHO1FBQ0ssK0JBQTBCLEdBQVksS0FBSyxDQUFDO1FBUXBEOztXQUVHO1FBQ0ssU0FBSSxHQUEyQixFQUFFLENBQUM7UUFPeEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQztRQUNqQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUM7UUFDbkQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQztRQUVuRCxrRUFBa0U7UUFDbEUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFNUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxJQUFJLENBQUMsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO1NBQ3pFO1FBRUQsNkNBQTZDO1FBQzdDLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxD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LGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7YUFDMUY7U0FDRjtJQUNILENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksTUFBTSxDQUFDLE9BQWUsRUFBRSxHQUFXO1FBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQzNCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLE1BQU0sQ0FBQyxPQUFlO1FBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLE9BQU8sR0FBRyxDQUFDLENBQUM7U0FDaEU7UUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVEOzs7T0FHRztJQUNJLHVCQUF1QjtRQUM1QixJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDO0lBQ3pDLENBQUM7Q0FDRjtBQTVSRCwwQkE0UkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBlYzIgZnJvbSAnQGF3cy1jZGsvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IElFbnZpcm9ubWVudCB9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnRDYXBhY2l0eVR5cGUsIFNlcnZpY2VCdWlsZCB9IGZyb20gJy4vZXh0ZW5zaW9ucy9leHRlbnNpb24taW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBTZXJ2aWNlRGVzY3JpcHRpb24gfSBmcm9tICcuL3NlcnZpY2UtZGVzY3JpcHRpb24nO1xuXG4vKipcbiAqIGNvbm5lY3RUb1Byb3BzIHdpbGwgaGF2ZSBhbGwgdGhlIGV4dHJhIHBhcmFtZXRlcnMgd2hpY2ggYXJlIHJlcXVpcmVkIGZvciBjb25uZWN0aW5nIHNlcnZpY2VzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbm5lY3RUb1Byb3BzIHtcbiAgLyoqXG4gICAqIGxvY2FsX2JpbmRfcG9ydCBpcyB0aGUgbG9jYWwgcG9ydCB0aGF0IHRoaXMgYXBwbGljYXRpb24gc2hvdWxkXG4gICAqIHVzZSB3aGVuIGNhbGxpbmcgdGhlIHVwc3RyZWFtIHNlcnZpY2UgaW4gRUNTIENvbnN1bCBNZXNoIEV4dGVuc2lvblxuICAgKiBDdXJyZW50bHksIHRoaXMgcGFyYW1ldGVyIHdpbGwgb25seSBiZSB1c2VkIGluIHRoZSBFQ1NDb25zdWxNZXNoRXh0ZW5zaW9uXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MtaWEvZWNzLWNvbnN1bC1tZXNoLWV4dGVuc2lvblxuICAgKi9cbiAgcmVhZG9ubHkgbG9jYWxfYmluZF9wb3J0PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFRoZSBzZXR0aW5ncyBmb3IgYW4gRUNTIFNlcnZpY2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmljZVByb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBTZXJ2aWNlRGVzY3JpcHRpb24gdXNlZCB0byBidWlsZCB0aGUgc2VydmljZS5cbiAgICovXG4gIHJlYWRvbmx5IHNlcnZpY2VEZXNjcmlwdGlvbjogU2VydmljZURlc2NyaXB0aW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgZW52aXJvbm1lbnQgdG8gbGF1bmNoIHRoZSBzZXJ2aWNlIGluLlxuICAgKi9cbiAgcmVhZG9ubHkgZW52aXJvbm1lbnQ6IElFbnZpcm9ubWVudFxuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgSUFNIHJvbGUgdGhhdCBncmFudHMgY29udGFpbmVycyBpbiB0aGUgdGFzayBwZXJtaXNzaW9uIHRvIGNhbGwgQVdTIEFQSXMgb24geW91ciBiZWhhbGYuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gQSB0YXNrIHJvbGUgaXMgYXV0b21hdGljYWxseSBjcmVhdGVkIGZvciB5b3UuXG4gICAqL1xuICByZWFkb25seSB0YXNrUm9sZT86IGlhbS5JUm9sZTtcblxuICAvKipcbiAgICogVGhlIGRlc2lyZWQgbnVtYmVyIG9mIGluc3RhbnRpYXRpb25zIG9mIHRoZSB0YXNrIGRlZmluaXRpb24gdG8ga2VlcCBydW5uaW5nIG9uIHRoZSBzZXJ2aWNlLlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIFdoZW4gY3JlYXRpbmcgdGhlIHNlcnZpY2UsIGRlZmF1bHQgaXMgMTsgd2hlbiB1cGRhdGluZyB0aGUgc2VydmljZSwgZGVmYXVsdCB1c2VzXG4gICAqIHRoZSBjdXJyZW50IHRhc2sgbnVtYmVyLlxuICAgKi9cbiAgcmVhZG9ubHkgZGVzaXJlZENvdW50PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgb3B0aW9ucyBmb3IgY29uZmlndXJpbmcgdGhlIGF1dG8gc2NhbGluZyB0YXJnZXQuXG4gICAqXG4gICAqIEBkZWZhdWx0IG5vbmVcbiAgICovXG4gIHJlYWRvbmx5IGF1dG9TY2FsZVRhc2tDb3VudD86IEF1dG9TY2FsaW5nT3B0aW9ucztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBdXRvU2NhbGluZ09wdGlvbnMge1xuICAvKipcbiAgICogVGhlIG1pbmltdW0gbnVtYmVyIG9mIHRhc2tzIHdoZW4gc2NhbGluZyBpbi5cbiAgICpcbiAgICogQGRlZmF1bHQgLSAxXG4gICAqL1xuICByZWFkb25seSBtaW5UYXNrQ291bnQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgdGFza3Mgd2hlbiBzY2FsaW5nIG91dC5cbiAgICAqL1xuICByZWFkb25seSBtYXhUYXNrQ291bnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIHRhcmdldCB2YWx1ZSBmb3IgQ1BVIHV0aWxpemF0aW9uIGFjcm9zcyBhbGwgdGFza3MgaW4gdGhlIHNlcnZpY2UuXG4gICAqL1xuICByZWFkb25seSB0YXJnZXRDcHVVdGlsaXphdGlvbj86IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIHRhcmdldCB2YWx1ZSBmb3IgbWVtb3J5IHV0aWxpemF0aW9uIGFjcm9zcyBhbGwgdGFza3MgaW4gdGhlIHNlcnZpY2UuXG4gICAqL1xuICByZWFkb25seSB0YXJnZXRNZW1vcnlVdGlsaXphdGlvbj86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBUaGlzIFNlcnZpY2UgY29uc3RydWN0IHNlcnZlcyBhcyBhIEJ1aWxkZXIgY2xhc3MgZm9yIGFuIEVDUyBzZXJ2aWNlLiBJdFxuICogc3VwcG9ydHMgdmFyaW91cyBleHRlbnNpb25zIGFuZCBrZWVwcyB0cmFjayBvZiBhbnkgbXV0YXRpbmcgc3RhdGUsIGFsbG93aW5nXG4gKiBpdCB0byBidWlsZCB1cCBhbiBFQ1Mgc2VydmljZSBwcm9ncmVzc2l2ZWx5LlxuICovXG5leHBvcnQgY2xhc3MgU2VydmljZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIC8qKlxuICAgKiBUaGUgdW5kZXJseWluZyBFQ1Mgc2VydmljZSB0aGF0IHdhcyBjcmVhdGVkLlxuICAgKi9cbiAgcHVibGljIGVjc1NlcnZpY2UhOiBlY3MuRWMyU2VydmljZSB8IGVjcy5GYXJnYXRlU2VydmljZTtcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIHNlcnZpY2UuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgaWQ6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIFZQQyB3aGVyZSB0aGlzIHNlcnZpY2Ugc2hvdWxkIGJlIHBsYWNlZC5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB2cGM6IGVjMi5JVnBjO1xuXG4gIC8qKlxuICAgKiBUaGUgY2x1c3RlciB0aGF0IGlzIHByb3ZpZGluZyBjYXBhY2l0eSBmb3IgdGhpcyBzZXJ2aWNlLlxuICAgKiBbZGlzYWJsZS1hd3NsaW50OnJlZi12aWEtaW50ZXJmYWNlXVxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGNsdXN0ZXI6IGVjcy5JQ2x1c3RlcjtcblxuICAvKipcbiAgICogVGhlIGNhcGFjaXR5IHR5cGUgdGhhdCB0aGlzIHNlcnZpY2Ugd2lsbCB1c2UuXG4gICAqIFZhbGlkIHZhbHVlcyBhcmUgRUMyIG9yIEZBUkdBVEUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgY2FwYWNpdHlUeXBlOiBFbnZpcm9ubWVudENhcGFjaXR5VHlwZTtcblxuICAvKipcbiAgICogVGhlIFNlcnZpY2VEZXNjcmlwdGlvbiB1c2VkIHRvIGJ1aWxkIHRoaXMgc2VydmljZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBzZXJ2aWNlRGVzY3JpcHRpb246IFNlcnZpY2VEZXNjcmlwdGlvbjtcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IHdoZXJlIHRoaXMgc2VydmljZSB3YXMgbGF1bmNoZWQuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZW52aXJvbm1lbnQ6IElFbnZpcm9ubWVudDtcblxuICAvKipcbiAgICogVGhlIHNjYWxhYmxlIGF0dHJpYnV0ZSByZXByZXNlbnRpbmcgdGFzayBjb3VudC5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBzY2FsYWJsZVRhc2tDb3VudD86IGVjcy5TY2FsYWJsZVRhc2tDb3VudDtcblxuICAvKipcbiAgICogVGhlIGZsYWcgdG8gdHJhY2sgaWYgYXV0byBzY2FsaW5nIHBvbGljaWVzIGhhdmUgYmVlbiBjb25maWd1cmVkXG4gICAqIGZvciB0aGUgc2VydmljZS5cbiAgICovXG4gIHByaXZhdGUgYXV0b1NjYWxpbmdQb2xpY2llc0VuYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogVGhlIGdlbmVyYXRlZCB0YXNrIGRlZmluaXRpb24gZm9yIHRoaXMgc2VydmljZS4gSXQgaXMgb25seVxuICAgKiBnZW5lcmF0ZWQgYWZ0ZXIgLnByZXBhcmUoKSBoYXMgYmVlbiBleGVjdXRlZC5cbiAgICovXG4gIHByb3RlY3RlZCB0YXNrRGVmaW5pdGlvbiE6IGVjcy5UYXNrRGVmaW5pdGlvbjtcblxuICAvKipcbiAgICogVGhlIGxpc3Qgb2YgVVJMcyBhc3NvY2lhdGVkIHdpdGggdGhpcyBzZXJ2aWNlLlxuICAgKi9cbiAgcHJpdmF0ZSB1cmxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzY29wZTogQ29uc3RydWN0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTZXJ2aWNlUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgdGhpcy5zY29wZSA9IHNjb3BlO1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgICB0aGlzLmVudmlyb25tZW50ID0gcHJvcHMuZW52aXJvbm1lbnQ7XG4gICAgdGhpcy52cGMgPSBwcm9wcy5lbnZpcm9ubWVudC52cGM7XG4gICAgdGhpcy5jbHVzdGVyID0gcHJvcHMuZW52aXJvbm1lbnQuY2x1c3RlcjtcbiAgICB0aGlzLmNhcGFjaXR5VHlwZSA9IHByb3BzLmVudmlyb25tZW50LmNhcGFjaXR5VHlwZTtcbiAgICB0aGlzLnNlcnZpY2VEZXNjcmlwdGlvbiA9IHByb3BzLnNlcnZpY2VEZXNjcmlwdGlvbjtcblxuICAgIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB1c2VyIGhhcyBhY3R1YWxseSBhZGRlZCBhIGNvbnRhaW5lclxuICAgIGNvbnN0IGNvbnRhaW5lcmV4dGVuc2lvbiA9IHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmdldCgnc2VydmljZS1jb250YWluZXInKTtcblxuICAgIGlmICghY29udGFpbmVyZXh0ZW5zaW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlcnZpY2UgJyR7dGhpcy5pZH0nIG11c3QgaGF2ZSBhIENvbnRhaW5lciBleHRlbnNpb25gKTtcbiAgICB9XG5cbiAgICAvLyBGaXJzdCBzZXQgdGhlIHNjb3BlIGZvciBhbGwgdGhlIGV4dGVuc2lvbnNcbiAgICBmb3IgKGNvbnN0IGV4dGVuc2lvbnMgaW4gdGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9ucykge1xuICAgICAgaWYgKHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnNbZXh0ZW5zaW9uc10pIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9uc1tleHRlbnNpb25zXS5wcmVob29rKHRoaXMsIHRoaXMuc2NvcGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEF0IHRoZSBwb2ludCBvZiBwcmVwYXJhdGlvbiBhbGwgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gZGVmaW5lZCBvbiB0aGUgc2VydmljZVxuICAgIC8vIHNvIGdpdmUgZWFjaCBleHRlbnNpb24gYSBjaGFuY2UgdG8gbm93IGFkZCBob29rcyB0byBvdGhlciBleHRlbnNpb25zIGlmXG4gICAgLy8gbmVlZGVkXG4gICAgZm9yIChjb25zdCBleHRlbnNpb25zIGluIHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnMpIHtcbiAgICAgIGlmICh0aGlzLnNlcnZpY2VEZXNjcmlwdGlvbi5leHRlbnNpb25zW2V4dGVuc2lvbnNdKSB7XG4gICAgICAgIHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnNbZXh0ZW5zaW9uc10uYWRkSG9va3MoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBHaXZlIGVhY2ggZXh0ZW5zaW9uIGEgY2hhbmNlIHRvIG11dGF0ZSB0aGUgdGFzayBkZWYgY3JlYXRpb24gcHJvcGVydGllc1xuICAgIGxldCB0YXNrRGVmUHJvcHMgPSB7XG4gICAgICAvLyBEZWZhdWx0IENQVSBhbmQgbWVtb3J5XG4gICAgICBjcHU6ICcyNTYnLFxuICAgICAgbWVtb3J5OiAnNTEyJyxcblxuICAgICAgLy8gQWxsb3cgdXNlciB0byBwcmUtZGVmaW5lIHRoZSB0YXNrUm9sZSBzbyB0aGF0IGl0IGNhbiBiZSB1c2VkIGluIHJlc291cmNlIHBvbGljaWVzIHRoYXQgbWF5XG4gICAgICAvLyBiZSBkZWZpbmVkIGJlZm9yZSB0aGUgRUNTIHNlcnZpY2UgZXhpc3RzIGluIGEgQ0RLIGFwcGxpY2F0aW9uXG4gICAgICB0YXNrUm9sZTogcHJvcHMudGFza1JvbGUsXG5cbiAgICAgIC8vIEVuc3VyZSB0aGF0IHRoZSB0YXNrIGRlZmluaXRpb24gc3VwcG9ydHMgYm90aCBFQzIgYW5kIEZhcmdhdGVcbiAgICAgIGNvbXBhdGliaWxpdHk6IGVjcy5Db21wYXRpYmlsaXR5LkVDMl9BTkRfRkFSR0FURSxcbiAgICB9IGFzIGVjcy5UYXNrRGVmaW5pdGlvblByb3BzO1xuICAgIGZvciAoY29uc3QgZXh0ZW5zaW9ucyBpbiB0aGlzLnNlcnZpY2VEZXNjcmlwdGlvbi5leHRlbnNpb25zKSB7XG4gICAgICBpZiAodGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9uc1tleHRlbnNpb25zXSkge1xuICAgICAgICB0YXNrRGVmUHJvcHMgPSB0aGlzLnNlcnZpY2VEZXNjcmlwdGlvbi5leHRlbnNpb25zW2V4dGVuc2lvbnNdLm1vZGlmeVRhc2tEZWZpbml0aW9uUHJvcHModGFza0RlZlByb3BzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgdGhhdCB0aGUgdGFzayBkZWZpbml0aW9uIHByb3BlcnRpZXMgYXJlIGFzc2VtYmxlZCwgY3JlYXRlIGl0XG4gICAgdGhpcy50YXNrRGVmaW5pdGlvbiA9IG5ldyBlY3MuVGFza0RlZmluaXRpb24odGhpcy5zY29wZSwgYCR7dGhpcy5pZH0tdGFzay1kZWZpbml0aW9uYCwgdGFza0RlZlByb3BzKTtcblxuICAgIC8vIE5vdyBnaXZlIGVhY2ggZXh0ZW5zaW9uIGEgY2hhbmNlIHRvIHVzZSB0aGUgdGFzayBkZWZpbml0aW9uXG4gICAgZm9yIChjb25zdCBleHRlbnNpb25zIGluIHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnMpIHtcbiAgICAgIGlmICh0aGlzLnNlcnZpY2VEZXNjcmlwdGlvbi5leHRlbnNpb25zW2V4dGVuc2lvbnNdKSB7XG4gICAgICAgIHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnNbZXh0ZW5zaW9uc10udXNlVGFza0RlZmluaXRpb24odGhpcy50YXNrRGVmaW5pdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm93IHRoYXQgYWxsIGNvbnRhaW5lcnMgYXJlIGNyZWF0ZWQsIGdpdmUgZWFjaCBleHRlbnNpb24gYSBjaGFuY2VcbiAgICAvLyB0byBiYWtlIGl0cyBkZXBlbmRlbmN5IGdyYXBoXG4gICAgZm9yIChjb25zdCBleHRlbnNpb25zIGluIHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnMpIHtcbiAgICAgIGlmICh0aGlzLnNlcnZpY2VEZXNjcmlwdGlvbi5leHRlbnNpb25zW2V4dGVuc2lvbnNdKSB7XG4gICAgICAgIHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnNbZXh0ZW5zaW9uc10ucmVzb2x2ZUNvbnRhaW5lckRlcGVuZGVuY2llcygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEdpdmUgZWFjaCBleHRlbnNpb24gYSBjaGFuY2UgdG8gbXV0YXRlIHRoZSBzZXJ2aWNlIHByb3BzIGJlZm9yZVxuICAgIC8vIHNlcnZpY2UgY3JlYXRpb25cbiAgICBsZXQgc2VydmljZVByb3BzID0ge1xuICAgICAgY2x1c3RlcjogdGhpcy5jbHVzdGVyLFxuICAgICAgdGFza0RlZmluaXRpb246IHRoaXMudGFza0RlZmluaXRpb24sXG4gICAgICBtaW5IZWFsdGh5UGVyY2VudDogMTAwLFxuICAgICAgbWF4SGVhbHRoeVBlcmNlbnQ6IDIwMCxcbiAgICAgIGRlc2lyZWRDb3VudDogcHJvcHMuZGVzaXJlZENvdW50ID8/IDEsXG4gICAgfSBhcyBTZXJ2aWNlQnVpbGQ7XG5cbiAgICBmb3IgKGNvbnN0IGV4dGVuc2lvbnMgaW4gdGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9ucykge1xuICAgICAgaWYgKHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnNbZXh0ZW5zaW9uc10pIHtcbiAgICAgICAgc2VydmljZVByb3BzID0gdGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9uc1tleHRlbnNpb25zXS5tb2RpZnlTZXJ2aWNlUHJvcHMoc2VydmljZVByb3BzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiBhIG1heEhlYWx0aHlQZXJjZW50IGFuZCBkZXNpcmVkIGNvdW50IGhhcyBiZWVuIHNldCB3aGlsZSBtaW5IZWFsdGh5UGVyY2VudCA9PSAxMDAlIHRoZW4gd2VcbiAgICAvLyBuZWVkIHRvIGRvIHNvbWUgZmFpbHNhZmUgY2hlY2tpbmcgdG8gZW5zdXJlIHRoYXQgdGhlIG1heEhlYWx0aHlQZXJjZW50XG4gICAgLy8gYWN0dWFsbHkgYWxsb3dzIGEgcm9sbGluZyBkZXBsb3kuIE90aGVyd2lzZSBpdCBpcyBwb3NzaWJsZSB0byBlbmQgdXAgd2l0aFxuICAgIC8vIGJsb2NrZWQgZGVwbG95cyB0aGF0IGNhbiB0YWtlIG5vIGFjdGlvbiBiZWNhdXNlIG1pbkhlYWx0eWhQZXJjZW50ID09IDEwMCVcbiAgICAvLyBwcmV2ZW50cyBydW5uaW5nLCBoZWFsdGh5IHRhc2tzIGZyb20gYmVpbmcgc3RvcHBlZCwgYnV0IGEgbG93IG1heEhlYWx0aHlQZXJjZW50XG4gICAgLy8gY2FuIGFsc28gcHJldmVudHMgbmV3IHBhcmFsbGVsIHRhc2tzIGZyb20gYmVpbmcgc3RhcnRlZC5cbiAgICBpZiAoc2VydmljZVByb3BzLm1heEhlYWx0aHlQZXJjZW50ICYmIHNlcnZpY2VQcm9wcy5kZXNpcmVkQ291bnQgJiYgc2VydmljZVByb3BzLm1pbkhlYWx0aHlQZXJjZW50ICYmIHNlcnZpY2VQcm9wcy5taW5IZWFsdGh5UGVyY2VudCA9PSAxMDApIHtcbiAgICAgIGlmIChzZXJ2aWNlUHJvcHMuZGVzaXJlZENvdW50ID09IDEpIHtcbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgb25lIHRhc2sgdGhlbiB3ZSBtdXN0IGFsbG93IG1heCBwZXJjZW50YWdlIHRvIGJlIGF0XG4gICAgICAgIC8vIGxlYXN0IDIwMCUgZm9yIGFub3RoZXIgcmVwbGFjZW1lbnQgdGFzayB0byBiZSBhZGRlZFxuICAgICAgICBzZXJ2aWNlUHJvcHMgPSB7XG4gICAgICAgICAgLi4uc2VydmljZVByb3BzLFxuICAgICAgICAgIG1heEhlYWx0aHlQZXJjZW50OiBNYXRoLm1heCgyMDAsIHNlcnZpY2VQcm9wcy5tYXhIZWFsdGh5UGVyY2VudCksXG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHNlcnZpY2VQcm9wcy5kZXNpcmVkQ291bnQgPD0gMykge1xuICAgICAgICAvLyBJZiB0YXNrIGNvdW50IGlzIDIgb3IgMyB0aGVuIG1heCBwZXJjZW50IG11c3QgYmUgYXQgbGVhc3QgMTUwJSB0b1xuICAgICAgICAvLyBhbGxvdyBvbmUgcmVwbGFjZW1lbnQgdGFzayB0byBiZSBsYXVuY2hlZCBhdCBhIHRpbWUuXG4gICAgICAgIHNlcnZpY2VQcm9wcyA9IHtcbiAgICAgICAgICAuLi5zZXJ2aWNlUHJvcHMsXG4gICAgICAgICAgbWF4SGVhbHRoeVBlcmNlbnQ6IE1hdGgubWF4KDE1MCwgc2VydmljZVByb3BzLm1heEhlYWx0aHlQZXJjZW50KSxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZvciBhbnl0aGluZyBoaWdoZXIgdGhhbiAzIHRhc2tzIHNldCBtYXggcGVyY2VudCB0byBhdCBsZWFzdCAxMjUlXG4gICAgICAgIC8vIEZvciA0IHRhc2tzIHRoaXMgd2lsbCBhbGxvdyBleGFjdGx5IG9uZSBleHRyYSByZXBsYWNlbWVudCB0YXNrXG4gICAgICAgIC8vIGF0IGEgdGltZSwgZm9yIGFueSBoaWdoZXIgdGFzayBjb3VudCBpdCB3aWxsIGFsbG93IDI1JSBvZiB0aGUgdGFza3NcbiAgICAgICAgLy8gdG8gYmUgcmVwbGFjZWQgYXQgYSB0aW1lLlxuICAgICAgICBzZXJ2aWNlUHJvcHMgPSB7XG4gICAgICAgICAgLi4uc2VydmljZVByb3BzLFxuICAgICAgICAgIG1heEhlYWx0aHlQZXJjZW50OiBNYXRoLm1heCgxMjUsIHNlcnZpY2VQcm9wcy5tYXhIZWFsdGh5UGVyY2VudCksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2V0IGRlc2lyZWRDb3VudCB0byBgdW5kZWZpbmVkYCBpZiBhdXRvIHNjYWxpbmcgaXMgY29uZmlndXJlZCBmb3IgdGhlIHNlcnZpY2VcbiAgICBpZiAocHJvcHMuYXV0b1NjYWxlVGFza0NvdW50IHx8IHRoaXMuYXV0b1NjYWxpbmdQb2xpY2llc0VuYWJsZWQpIHtcbiAgICAgIHNlcnZpY2VQcm9wcyA9IHtcbiAgICAgICAgLi4uc2VydmljZVByb3BzLFxuICAgICAgICBkZXNpcmVkQ291bnQ6IHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gTm93IHRoYXQgdGhlIHNlcnZpY2UgcHJvcHMgYXJlIGRldGVybWluZWQgd2UgY2FuIGNyZWF0ZVxuICAgIC8vIHRoZSBzZXJ2aWNlXG4gICAgaWYgKHRoaXMuY2FwYWNpdHlUeXBlID09PSBFbnZpcm9ubWVudENhcGFjaXR5VHlwZS5FQzIpIHtcbiAgICAgIHRoaXMuZWNzU2VydmljZSA9IG5ldyBlY3MuRWMyU2VydmljZSh0aGlzLnNjb3BlLCBgJHt0aGlzLmlkfS1zZXJ2aWNlYCwgc2VydmljZVByb3BzKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY2FwYWNpdHlUeXBlID09PSBFbnZpcm9ubWVudENhcGFjaXR5VHlwZS5GQVJHQVRFKSB7XG4gICAgICB0aGlzLmVjc1NlcnZpY2UgPSBuZXcgZWNzLkZhcmdhdGVTZXJ2aWNlKHRoaXMuc2NvcGUsIGAke3RoaXMuaWR9LXNlcnZpY2VgLCBzZXJ2aWNlUHJvcHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gY2FwYWNpdHkgdHlwZSBmb3Igc2VydmljZSAke3RoaXMuaWR9YCk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIHRoZSBhdXRvIHNjYWxpbmcgdGFyZ2V0IGFuZCBjb25maWd1cmUgdGFyZ2V0IHRyYWNraW5nIHBvbGljaWVzIGFmdGVyIHRoZSBzZXJ2aWNlIGlzIGNyZWF0ZWRcbiAgICBpZiAocHJvcHMuYXV0b1NjYWxlVGFza0NvdW50KSB7XG4gICAgICB0aGlzLnNjYWxhYmxlVGFza0NvdW50ID0gdGhpcy5lY3NTZXJ2aWNlLmF1dG9TY2FsZVRhc2tDb3VudCh7XG4gICAgICAgIG1heENhcGFjaXR5OiBwcm9wcy5hdXRvU2NhbGVUYXNrQ291bnQubWF4VGFza0NvdW50LFxuICAgICAgICBtaW5DYXBhY2l0eTogcHJvcHMuYXV0b1NjYWxlVGFza0NvdW50Lm1pblRhc2tDb3VudCxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAocHJvcHMuYXV0b1NjYWxlVGFza0NvdW50LnRhcmdldENwdVV0aWxpemF0aW9uKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldENwdVV0aWxpemF0aW9uUGVyY2VudCA9IHByb3BzLmF1dG9TY2FsZVRhc2tDb3VudC50YXJnZXRDcHVVdGlsaXphdGlvbjtcbiAgICAgICAgdGhpcy5zY2FsYWJsZVRhc2tDb3VudC5zY2FsZU9uQ3B1VXRpbGl6YXRpb24oYCR7dGhpcy5pZH0tdGFyZ2V0LWNwdS11dGlsaXphdGlvbi0ke3RhcmdldENwdVV0aWxpemF0aW9uUGVyY2VudH1gLCB7XG4gICAgICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiB0YXJnZXRDcHVVdGlsaXphdGlvblBlcmNlbnQsXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmVuYWJsZUF1dG9TY2FsaW5nUG9saWN5KCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcm9wcy5hdXRvU2NhbGVUYXNrQ291bnQudGFyZ2V0TWVtb3J5VXRpbGl6YXRpb24pIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0TWVtb3J5VXRpbGl6YXRpb25QZXJjZW50ID0gcHJvcHMuYXV0b1NjYWxlVGFza0NvdW50LnRhcmdldE1lbW9yeVV0aWxpemF0aW9uO1xuICAgICAgICB0aGlzLnNjYWxhYmxlVGFza0NvdW50LnNjYWxlT25NZW1vcnlVdGlsaXphdGlvbihgJHt0aGlzLmlkfS10YXJnZXQtbWVtb3J5LXV0aWxpemF0aW9uLSR7dGFyZ2V0TWVtb3J5VXRpbGl6YXRpb25QZXJjZW50fWAsIHtcbiAgICAgICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IHRhcmdldE1lbW9yeVV0aWxpemF0aW9uUGVyY2VudCxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW5hYmxlQXV0b1NjYWxpbmdQb2xpY3koKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgZ2l2ZSBhbGwgZXh0ZW5zaW9ucyBhIGNoYW5jZSB0byB1c2UgdGhlIHNlcnZpY2VcbiAgICBmb3IgKGNvbnN0IGV4dGVuc2lvbnMgaW4gdGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9ucykge1xuICAgICAgaWYgKHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnNbZXh0ZW5zaW9uc10pIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9uc1tleHRlbnNpb25zXS51c2VTZXJ2aWNlKHRoaXMuZWNzU2VydmljZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRXJyb3Igb3V0IGlmIHRoZSBhdXRvIHNjYWxpbmcgdGFyZ2V0IGlzIGNyZWF0ZWQgYnV0IG5vIHNjYWxpbmcgcG9saWNpZXMgaGF2ZSBiZWVuIGNvbmZpZ3VyZWRcbiAgICBpZiAodGhpcy5zY2FsYWJsZVRhc2tDb3VudCAmJiAhdGhpcy5hdXRvU2NhbGluZ1BvbGljaWVzRW5hYmxlZCkge1xuICAgICAgdGhyb3cgRXJyb3IoYFRoZSBhdXRvIHNjYWxpbmcgdGFyZ2V0IGZvciB0aGUgc2VydmljZSAnJHt0aGlzLmlkfScgaGFzIGJlZW4gY3JlYXRlZCBidXQgbm8gYXV0byBzY2FsaW5nIHBvbGljaWVzIGhhdmUgYmVlbiBjb25maWd1cmVkLmApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUZWxsIGV4dGVuc2lvbnMgZnJvbSBvbmUgc2VydmljZSB0byBjb25uZWN0IHRvIGV4dGVuc2lvbnMgZnJvbVxuICAgKiBhbm90aGVyIHNldmljZSBpZiB0aGV5IGhhdmUgaW1wbGVtZW50ZWQgYSBob29rIGZvciBpdC5cbiAgICpcbiAgICogQHBhcmFtIHNlcnZpY2VcbiAgICovXG4gIHB1YmxpYyBjb25uZWN0VG8oc2VydmljZTogU2VydmljZSwgY29ubmVjdFRvUHJvcHM6IENvbm5lY3RUb1Byb3BzID0ge30pIHtcbiAgICBmb3IgKGNvbnN0IGV4dGVuc2lvbnMgaW4gdGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9ucykge1xuICAgICAgaWYgKHRoaXMuc2VydmljZURlc2NyaXB0aW9uLmV4dGVuc2lvbnNbZXh0ZW5zaW9uc10pIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlRGVzY3JpcHRpb24uZXh0ZW5zaW9uc1tleHRlbnNpb25zXS5jb25uZWN0VG9TZXJ2aWNlKHNlcnZpY2UsIGNvbm5lY3RUb1Byb3BzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBtZXRob2QgYWRkcyBhIG5ldyBVUkwgZm9yIHRoZSBzZXJ2aWNlLiBUaGlzIGFsbG93cyBleHRlbnNpb25zIHRvXG4gICAqIHN1Ym1pdCBhIFVSTCBmb3IgdGhlIHNlcnZpY2UuIEZvciBleGFtcGxlLCBhIGxvYWQgYmFsYW5jZXIgbWlnaHQgYWRkIGl0c1xuICAgKiBVUkwsIG9yIEFwcCBNZXNoIGNhbiBhZGQgaXRzIEROUyBuYW1lIGZvciB0aGUgc2VydmljZS5cbiAgICpcbiAgICogQHBhcmFtIHVybE5hbWUgLSBUaGUgaWRlbnRpZmllciBuYW1lIGZvciB0aGlzIFVSTFxuICAgKiBAcGFyYW0gdXJsIC0gVGhlIFVSTCBpdHNlbGYuXG4gICAqL1xuICBwdWJsaWMgYWRkVVJMKHVybE5hbWU6IHN0cmluZywgdXJsOiBzdHJpbmcpIHtcbiAgICB0aGlzLnVybHNbdXJsTmFtZV0gPSB1cmw7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYSBVUkwgZm9yIHRoZSBzZXJ2aWNlLiBUaGUgVVJMIG11c3QgaGF2ZSBwcmV2aW91c2x5IGJlZW5cbiAgICogc3RvcmVkIGJ5IG9uZSBvZiB0aGUgVVJMIHByb3ZpZGluZyBleHRlbnNpb25zLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsTmFtZSAtIFRoZSBVUkwgdG8gbG9vayB1cC5cbiAgICovXG4gIHB1YmxpYyBnZXRVUkwodXJsTmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKCF0aGlzLnVybHNbdXJsTmFtZV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgYSBVUkwgd2l0aCBuYW1lICcke3VybE5hbWV9J2ApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnVybHNbdXJsTmFtZV07XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBoZWxwZXIgbWV0aG9kIGlzIHVzZWQgdG8gc2V0IHRoZSBgYXV0b1NjYWxpbmdQb2xpY2llc0VuYWJsZWRgIGF0dHJpYnV0ZVxuICAgKiB3aGVuZXZlciBhbiBhdXRvIHNjYWxpbmcgcG9saWN5IGlzIGNvbmZpZ3VyZWQgZm9yIHRoZSBzZXJ2aWNlLlxuICAgKi9cbiAgcHVibGljIGVuYWJsZUF1dG9TY2FsaW5nUG9saWN5KCkge1xuICAgIHRoaXMuYXV0b1NjYWxpbmdQb2xpY2llc0VuYWJsZWQgPSB0cnVlO1xuICB9XG59XG4iXX0=