"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerMutatingHook = exports.ServiceExtension = exports.EnvironmentCapacityType = void 0;
/**
 * The types of capacity that are supported. These capacity types may change the
 * behavior of an extension.
 */
var EnvironmentCapacityType;
(function (EnvironmentCapacityType) {
    /**
     * Specify that the environment should use AWS Fargate for
     * hosting containers.
     */
    EnvironmentCapacityType["FARGATE"] = "fargate";
    /**
     * Specify that the environment should launch containers onto
     * EC2 instances.
     */
    EnvironmentCapacityType["EC2"] = "ec2";
})(EnvironmentCapacityType = exports.EnvironmentCapacityType || (exports.EnvironmentCapacityType = {}));
/**
 * The shape of a service extension. This abstract class is implemented
 * by other extensions that extend the hooks to implement any custom
 * logic that they want to run during each step of preparing the service.
 */
class ServiceExtension {
    constructor(name) {
        // A list of other extensions which want to mutate the
        // container definition for this extension.
        this.containerMutatingHooks = [];
        this.name = name;
    }
    /**
     * A hook that allows the extension to add hooks to other
     * extensions that are registered.
     */
    addHooks() { } // tslint:disable-line
    /**
     * This hook allows another service extension to register a mutating hook for
     * changing the primary container of this extension. This is primarily used
     * for the application extension. For example, the Firelens extension wants to
     * be able to modify the settings of the application container to
     * route logs through Firelens.
     *
     * @param hook
     */
    addContainerMutatingHook(hook) {
        this.containerMutatingHooks.push(hook);
    }
    /**
     * This is a hook which allows extensions to modify the settings of the
     * task definition prior to it being created. For example, the App Mesh
     * extension needs to configure an Envoy proxy in the task definition,
     * or the Application extension wants to set the overall resource for
     * the task.
     *
     * @param props - Properties of the task definition to be created
     */
    modifyTaskDefinitionProps(props) {
        return {
            ...props,
        };
    }
    /**
     * A hook that is called for each extension ahead of time to
     * allow for any initial setup, such as creating resources in
     * advance.
     *
     * @param parent - The parent service which this extension has been added to
     * @param scope - The scope that this extension should create resources in
     */
    prehook(parent, scope) {
        this.parentService = parent;
        this.scope = scope;
    }
    /**
     * Once the task definition is created, this hook is called for each
     * extension to give it a chance to add containers to the task definition,
     * change the task definition's role to add permissions, etc.
     *
     * @param taskDefinition - The created task definition to add containers to
     */
    useTaskDefinition(taskDefinition) {
        taskDefinition = taskDefinition;
    }
    /**
     * Once all containers are added to the task definition, this hook is
     * called for each extension to give it a chance to resolve its dependency
     * graph so that its container starts in the right order based on the
     * other extensions that were enabled.
     */
    resolveContainerDependencies() {
        return;
    }
    /**
     * Prior to launching the task definition as a service, this hook
     * is called on each extension to give it a chance to mutate the properties
     * of the service to be created.
     *
     * @param props - The service properties to mutate.
     */
    modifyServiceProps(props) {
        return {
            ...props,
        };
    }
    /**
     * When this hook is implemented by extension, it allows the extension
     * to use the service which has been created. It is generally used to
     * create any final resources which might depend on the service itself.
     *
     * @param service - The generated service.
     */
    useService(service) {
        service = service;
    }
    /**
     * This hook allows the extension to establish a connection to
     * extensions from another service. Usually used for things like
     * allowing one service to talk to the load balancer or service mesh
     * proxy for another service.
     *
     * @param service - The other service to connect to.
     */
    connectToService(service, connectToProps) {
        service = service;
        connectToProps = connectToProps;
    }
}
exports.ServiceExtension = ServiceExtension;
/**
 * This is an abstract class wrapper for a mutating hook. It is
 * extended by any extension which wants to mutate other extension's containers.
 */
class ContainerMutatingHook {
    /**
     * This is a hook for modifying the container definition of any upstream
     * containers. This is primarily used for the main application container.
     * For example, the Firelens extension wants to be able to modify the logging
     * settings of the application container.
     *
     * @param props - The container definition to mutate.
     */
    mutateContainerDefinition(props) {
        return {
            ...props,
        };
    }
}
exports.ContainerMutatingHook = ContainerMutatingHook;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWludGVyZmFjZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleHRlbnNpb24taW50ZXJmYWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFLQTs7O0dBR0c7QUFDSCxJQUFZLHVCQVlYO0FBWkQsV0FBWSx1QkFBdUI7SUFDakM7OztPQUdHO0lBQ0gsOENBQW1CLENBQUE7SUFFbkI7OztPQUdHO0lBQ0gsc0NBQVcsQ0FBQTtBQUNiLENBQUMsRUFaVyx1QkFBdUIsR0FBdkIsK0JBQXVCLEtBQXZCLCtCQUF1QixRQVlsQztBQW1FRDs7OztHQUlHO0FBQ0gsTUFBc0IsZ0JBQWdCO0lBMkJwQyxZQUFZLElBQVk7UUFKeEIsc0RBQXNEO1FBQ3RELDJDQUEyQztRQUNqQywyQkFBc0IsR0FBNEIsRUFBRSxDQUFDO1FBRzdELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7SUFFRDs7O09BR0c7SUFDSSxRQUFRLEtBQUssQ0FBQyxDQUFDLHNCQUFzQjtJQUU1Qzs7Ozs7Ozs7T0FRRztJQUNJLHdCQUF3QixDQUFDLElBQTJCO1FBQ3pELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0kseUJBQXlCLENBQUMsS0FBOEI7UUFDN0QsT0FBTztZQUNMLEdBQUcsS0FBSztTQUNrQixDQUFDO0lBQy9CLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksT0FBTyxDQUFDLE1BQWUsRUFBRSxLQUFnQjtRQUM5QyxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztRQUM1QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0ksaUJBQWlCLENBQUMsY0FBa0M7UUFDekQsY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSw0QkFBNEI7UUFDakMsT0FBTztJQUNULENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxrQkFBa0IsQ0FBQyxLQUFtQjtRQUMzQyxPQUFPO1lBQ0wsR0FBRyxLQUFLO1NBQ08sQ0FBQztJQUNwQixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0ksVUFBVSxDQUFDLE9BQTRDO1FBQzVELE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDcEIsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSSxnQkFBZ0IsQ0FBQyxPQUFnQixFQUFFLGNBQThCO1FBQ3RFLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDbEIsY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUNsQyxDQUFDO0NBQ0Y7QUF2SUQsNENBdUlDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBc0IscUJBQXFCO0lBQ3pDOzs7Ozs7O09BT0c7SUFDSSx5QkFBeUIsQ0FBQyxLQUFxQztRQUNwRSxPQUFPO1lBQ0wsR0FBRyxLQUFLO1NBQ3lCLENBQUM7SUFDdEMsQ0FBQztDQUNGO0FBZEQsc0RBY0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBlY3MgZnJvbSAnQGF3cy1jZGsvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFNlcnZpY2UsIENvbm5lY3RUb1Byb3BzIH0gZnJvbSAnLi4vc2VydmljZSc7XG5cbi8qKlxuICogVGhlIHR5cGVzIG9mIGNhcGFjaXR5IHRoYXQgYXJlIHN1cHBvcnRlZC4gVGhlc2UgY2FwYWNpdHkgdHlwZXMgbWF5IGNoYW5nZSB0aGVcbiAqIGJlaGF2aW9yIG9mIGFuIGV4dGVuc2lvbi5cbiAqL1xuZXhwb3J0IGVudW0gRW52aXJvbm1lbnRDYXBhY2l0eVR5cGUge1xuICAvKipcbiAgICogU3BlY2lmeSB0aGF0IHRoZSBlbnZpcm9ubWVudCBzaG91bGQgdXNlIEFXUyBGYXJnYXRlIGZvclxuICAgKiBob3N0aW5nIGNvbnRhaW5lcnMuXG4gICAqL1xuICBGQVJHQVRFID0gJ2ZhcmdhdGUnLFxuXG4gIC8qKlxuICAgKiBTcGVjaWZ5IHRoYXQgdGhlIGVudmlyb25tZW50IHNob3VsZCBsYXVuY2ggY29udGFpbmVycyBvbnRvXG4gICAqIEVDMiBpbnN0YW5jZXMuXG4gICAqL1xuICBFQzIgPSAnZWMyJ1xufVxuXG4vKipcbiAqIEEgc2V0IG9mIG11dGFibGUgc2VydmljZSBwcm9wcyBpbiB0aGUgcHJvY2VzcyBvZiBiZWluZyBhc3NlbWJsZWQgdXNpbmcgYVxuICogYnVpbGRlciBwYXR0ZXJuLiBUaGV5IHdpbGwgZXZlbnR1YWxseSB0byBiZSB0cmFuc2xhdGVkIGludG8gYW5cbiAqIGVjcy5FYzJTZXJ2aWNlUHJvcHMgb3IgZWNzLkZhcmdhdGVTZXJ2aWNlUHJvcHMgaW50ZXJmYWNlLCBkZXBlbmRpbmcgb24gdGhlXG4gKiBlbnZpcm9ubWVudCdzIGNhcGFjaXR5IHR5cGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmljZUJ1aWxkIHtcbiAgLyoqXG4gICAqIFRoZSBjbHVzdGVyIGluIHdoaWNoIHRvIGxhdW5jaCB0aGUgc2VydmljZS5cbiAgICovXG4gIHJlYWRvbmx5IGNsdXN0ZXI6IGVjcy5JQ2x1c3RlcixcblxuICAvKipcbiAgICogVGhlIHRhc2sgZGVmaW5pdGlvbiByZWdpc3RlcmVkIHRvIHRoaXMgc2VydmljZS5cbiAgICovXG4gIHJlYWRvbmx5IHRhc2tEZWZpbml0aW9uOiBlY3MuVGFza0RlZmluaXRpb24sXG5cbiAgLyoqXG4gICAqIFNwZWNpZmllcyB3aGV0aGVyIHRoZSB0YXNrJ3MgZWxhc3RpYyBuZXR3b3JrIGludGVyZmFjZSByZWNlaXZlcyBhIHB1YmxpYyBJUFxuICAgKiBhZGRyZXNzLlxuICAgKlxuICAgKiBJZiB0cnVlLCBlYWNoIHRhc2sgd2lsbCByZWNlaXZlIGEgcHVibGljIElQIGFkZHJlc3MuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGFzc2lnblB1YmxpY0lwPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQ29uZmlndXJhdGlvbiBmb3IgaG93IHRvIHJlZ2lzdGVyIHRoZSBzZXJ2aWNlIGluIHNlcnZpY2UgZGlzY292ZXJ5LlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIE5vIENsb3VkIE1hcCBjb25maWd1cmVkXG4gICAqL1xuICByZWFkb25seSBjbG91ZE1hcE9wdGlvbnM/OiBlY3MuQ2xvdWRNYXBPcHRpb25zXG5cbiAgLyoqXG4gICAqIEhvdyBsb25nIHRoZSBoZWFsdGhjaGVjayBjYW4gZmFpbCBkdXJpbmcgaW5pdGlhbCB0YXNrIHN0YXJ0dXAgYmVmb3JlXG4gICAqIHRoZSB0YXNrIGlzIGNvbnNpZGVyZWQgdW5oZWFsdGh5LiBUaGlzIGlzIHVzZWQgdG8gZ2l2ZSB0aGUgdGFzayBtb3JlXG4gICAqIHRpbWUgdG8gc3RhcnQgcGFzc2luZyBoZWFsdGhjaGVja3MuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm8gZ3JhY2UgcGVyaW9kXG4gICAqL1xuICByZWFkb25seSBoZWFsdGhDaGVja0dyYWNlUGVyaW9kPzogY2RrLkR1cmF0aW9uLFxuXG4gIC8qKlxuICAgKiBIb3cgbWFueSB0YXNrcyB0byBydW4uXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gMVxuICAgKi9cbiAgcmVhZG9ubHkgZGVzaXJlZENvdW50PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBNaW5pbXVtIGhlYWx0aHkgdGFzayBwZXJjZW50YWdlLlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIDEwMFxuICAgKi9cbiAgcmVhZG9ubHkgbWluSGVhbHRoeVBlcmNlbnQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIE1heGltdW0gcGVyY2VudGFnZSBvZiB0YXNrcyB0aGF0IGNhbiBiZSBsYXVuY2hlZC5cbiAgICpcbiAgICogQGRlZmF1bHQgLSAyMDBcbiAgICovXG4gIHJlYWRvbmx5IG1heEhlYWx0aHlQZXJjZW50PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFRoZSBzaGFwZSBvZiBhIHNlcnZpY2UgZXh0ZW5zaW9uLiBUaGlzIGFic3RyYWN0IGNsYXNzIGlzIGltcGxlbWVudGVkXG4gKiBieSBvdGhlciBleHRlbnNpb25zIHRoYXQgZXh0ZW5kIHRoZSBob29rcyB0byBpbXBsZW1lbnQgYW55IGN1c3RvbVxuICogbG9naWMgdGhhdCB0aGV5IHdhbnQgdG8gcnVuIGR1cmluZyBlYWNoIHN0ZXAgb2YgcHJlcGFyaW5nIHRoZSBzZXJ2aWNlLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU2VydmljZUV4dGVuc2lvbiB7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgZXh0ZW5zaW9uLlxuICAgKi9cbiAgcHVibGljIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGNvbnRhaW5lciBmb3IgdGhpcyBleHRlbnNpb24uIE1vc3QgZXh0ZW5zaW9ucyBoYXZlIGEgY29udGFpbmVyLCBidXQgbm90XG4gICAqIGV2ZXJ5IGV4dGVuc2lvbiBpcyByZXF1aXJlZCB0byBoYXZlIGEgY29udGFpbmVyLiBTb21lIGV4dGVuc2lvbnMgbWF5IGp1c3RcbiAgICogbW9kaWZ5IHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBzZXJ2aWNlLCBvciBjcmVhdGUgZXh0ZXJuYWwgcmVzb3VyY2VzXG4gICAqIGNvbm5lY3RlZCB0byB0aGUgc2VydmljZS5cbiAgICovXG4gIHB1YmxpYyBjb250YWluZXI/OiBlY3MuQ29udGFpbmVyRGVmaW5pdGlvbjtcblxuICAvKipcbiAgICogVGhlIHNlcnZpY2Ugd2hpY2ggdGhpcyBleHRlbnNpb24gaXMgYmVpbmcgYWRkZWQgdG8uXG4gICAqIEluaXRpYWxseSwgZXh0ZW5zaW9ucyBhcmUgY29sbGVjdGVkIGludG8gYSBTZXJ2aWNlRGVzY3JpcHRpb24sIGJ1dCBubyBzZXJ2aWNlXG4gICAqIGV4aXN0cyB5ZXQuIExhdGVyLCB3aGVuIHRoZSBTZXJ2aWNlRGVzY3JpcHRpb24gaXMgdXNlZCB0byBjcmVhdGUgYSBzZXJ2aWNlLFxuICAgKiB0aGUgZXh0ZW5zaW9uIGlzIHRvbGQgd2hhdCBTZXJ2aWNlIGl0IGlzIG5vdyB3b3JraW5nIG9uLlxuICAgKi9cbiAgcHJvdGVjdGVkIHBhcmVudFNlcnZpY2UhOiBTZXJ2aWNlO1xuICBwcm90ZWN0ZWQgc2NvcGUhOiBDb25zdHJ1Y3Q7XG5cbiAgLy8gQSBsaXN0IG9mIG90aGVyIGV4dGVuc2lvbnMgd2hpY2ggd2FudCB0byBtdXRhdGUgdGhlXG4gIC8vIGNvbnRhaW5lciBkZWZpbml0aW9uIGZvciB0aGlzIGV4dGVuc2lvbi5cbiAgcHJvdGVjdGVkIGNvbnRhaW5lck11dGF0aW5nSG9va3M6IENvbnRhaW5lck11dGF0aW5nSG9va1tdID0gW107XG5cbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGhvb2sgdGhhdCBhbGxvd3MgdGhlIGV4dGVuc2lvbiB0byBhZGQgaG9va3MgdG8gb3RoZXJcbiAgICogZXh0ZW5zaW9ucyB0aGF0IGFyZSByZWdpc3RlcmVkLlxuICAgKi9cbiAgcHVibGljIGFkZEhvb2tzKCkgeyB9IC8vIHRzbGludDpkaXNhYmxlLWxpbmVcblxuICAvKipcbiAgICogVGhpcyBob29rIGFsbG93cyBhbm90aGVyIHNlcnZpY2UgZXh0ZW5zaW9uIHRvIHJlZ2lzdGVyIGEgbXV0YXRpbmcgaG9vayBmb3JcbiAgICogY2hhbmdpbmcgdGhlIHByaW1hcnkgY29udGFpbmVyIG9mIHRoaXMgZXh0ZW5zaW9uLiBUaGlzIGlzIHByaW1hcmlseSB1c2VkXG4gICAqIGZvciB0aGUgYXBwbGljYXRpb24gZXh0ZW5zaW9uLiBGb3IgZXhhbXBsZSwgdGhlIEZpcmVsZW5zIGV4dGVuc2lvbiB3YW50cyB0b1xuICAgKiBiZSBhYmxlIHRvIG1vZGlmeSB0aGUgc2V0dGluZ3Mgb2YgdGhlIGFwcGxpY2F0aW9uIGNvbnRhaW5lciB0b1xuICAgKiByb3V0ZSBsb2dzIHRocm91Z2ggRmlyZWxlbnMuXG4gICAqXG4gICAqIEBwYXJhbSBob29rXG4gICAqL1xuICBwdWJsaWMgYWRkQ29udGFpbmVyTXV0YXRpbmdIb29rKGhvb2s6IENvbnRhaW5lck11dGF0aW5nSG9vaykge1xuICAgIHRoaXMuY29udGFpbmVyTXV0YXRpbmdIb29rcy5wdXNoKGhvb2spO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgaXMgYSBob29rIHdoaWNoIGFsbG93cyBleHRlbnNpb25zIHRvIG1vZGlmeSB0aGUgc2V0dGluZ3Mgb2YgdGhlXG4gICAqIHRhc2sgZGVmaW5pdGlvbiBwcmlvciB0byBpdCBiZWluZyBjcmVhdGVkLiBGb3IgZXhhbXBsZSwgdGhlIEFwcCBNZXNoXG4gICAqIGV4dGVuc2lvbiBuZWVkcyB0byBjb25maWd1cmUgYW4gRW52b3kgcHJveHkgaW4gdGhlIHRhc2sgZGVmaW5pdGlvbixcbiAgICogb3IgdGhlIEFwcGxpY2F0aW9uIGV4dGVuc2lvbiB3YW50cyB0byBzZXQgdGhlIG92ZXJhbGwgcmVzb3VyY2UgZm9yXG4gICAqIHRoZSB0YXNrLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvcHMgLSBQcm9wZXJ0aWVzIG9mIHRoZSB0YXNrIGRlZmluaXRpb24gdG8gYmUgY3JlYXRlZFxuICAgKi9cbiAgcHVibGljIG1vZGlmeVRhc2tEZWZpbml0aW9uUHJvcHMocHJvcHM6IGVjcy5UYXNrRGVmaW5pdGlvblByb3BzKTogZWNzLlRhc2tEZWZpbml0aW9uUHJvcHMge1xuICAgIHJldHVybiB7XG4gICAgICAuLi5wcm9wcyxcbiAgICB9IGFzIGVjcy5UYXNrRGVmaW5pdGlvblByb3BzO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgaG9vayB0aGF0IGlzIGNhbGxlZCBmb3IgZWFjaCBleHRlbnNpb24gYWhlYWQgb2YgdGltZSB0b1xuICAgKiBhbGxvdyBmb3IgYW55IGluaXRpYWwgc2V0dXAsIHN1Y2ggYXMgY3JlYXRpbmcgcmVzb3VyY2VzIGluXG4gICAqIGFkdmFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJlbnQgLSBUaGUgcGFyZW50IHNlcnZpY2Ugd2hpY2ggdGhpcyBleHRlbnNpb24gaGFzIGJlZW4gYWRkZWQgdG9cbiAgICogQHBhcmFtIHNjb3BlIC0gVGhlIHNjb3BlIHRoYXQgdGhpcyBleHRlbnNpb24gc2hvdWxkIGNyZWF0ZSByZXNvdXJjZXMgaW5cbiAgICovXG4gIHB1YmxpYyBwcmVob29rKHBhcmVudDogU2VydmljZSwgc2NvcGU6IENvbnN0cnVjdCkge1xuICAgIHRoaXMucGFyZW50U2VydmljZSA9IHBhcmVudDtcbiAgICB0aGlzLnNjb3BlID0gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogT25jZSB0aGUgdGFzayBkZWZpbml0aW9uIGlzIGNyZWF0ZWQsIHRoaXMgaG9vayBpcyBjYWxsZWQgZm9yIGVhY2hcbiAgICogZXh0ZW5zaW9uIHRvIGdpdmUgaXQgYSBjaGFuY2UgdG8gYWRkIGNvbnRhaW5lcnMgdG8gdGhlIHRhc2sgZGVmaW5pdGlvbixcbiAgICogY2hhbmdlIHRoZSB0YXNrIGRlZmluaXRpb24ncyByb2xlIHRvIGFkZCBwZXJtaXNzaW9ucywgZXRjLlxuICAgKlxuICAgKiBAcGFyYW0gdGFza0RlZmluaXRpb24gLSBUaGUgY3JlYXRlZCB0YXNrIGRlZmluaXRpb24gdG8gYWRkIGNvbnRhaW5lcnMgdG9cbiAgICovXG4gIHB1YmxpYyB1c2VUYXNrRGVmaW5pdGlvbih0YXNrRGVmaW5pdGlvbjogZWNzLlRhc2tEZWZpbml0aW9uKSB7XG4gICAgdGFza0RlZmluaXRpb24gPSB0YXNrRGVmaW5pdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBPbmNlIGFsbCBjb250YWluZXJzIGFyZSBhZGRlZCB0byB0aGUgdGFzayBkZWZpbml0aW9uLCB0aGlzIGhvb2sgaXNcbiAgICogY2FsbGVkIGZvciBlYWNoIGV4dGVuc2lvbiB0byBnaXZlIGl0IGEgY2hhbmNlIHRvIHJlc29sdmUgaXRzIGRlcGVuZGVuY3lcbiAgICogZ3JhcGggc28gdGhhdCBpdHMgY29udGFpbmVyIHN0YXJ0cyBpbiB0aGUgcmlnaHQgb3JkZXIgYmFzZWQgb24gdGhlXG4gICAqIG90aGVyIGV4dGVuc2lvbnMgdGhhdCB3ZXJlIGVuYWJsZWQuXG4gICAqL1xuICBwdWJsaWMgcmVzb2x2ZUNvbnRhaW5lckRlcGVuZGVuY2llcygpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvKipcbiAgICogUHJpb3IgdG8gbGF1bmNoaW5nIHRoZSB0YXNrIGRlZmluaXRpb24gYXMgYSBzZXJ2aWNlLCB0aGlzIGhvb2tcbiAgICogaXMgY2FsbGVkIG9uIGVhY2ggZXh0ZW5zaW9uIHRvIGdpdmUgaXQgYSBjaGFuY2UgdG8gbXV0YXRlIHRoZSBwcm9wZXJ0aWVzXG4gICAqIG9mIHRoZSBzZXJ2aWNlIHRvIGJlIGNyZWF0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwcm9wcyAtIFRoZSBzZXJ2aWNlIHByb3BlcnRpZXMgdG8gbXV0YXRlLlxuICAgKi9cbiAgcHVibGljIG1vZGlmeVNlcnZpY2VQcm9wcyhwcm9wczogU2VydmljZUJ1aWxkKTogU2VydmljZUJ1aWxkIHtcbiAgICByZXR1cm4ge1xuICAgICAgLi4ucHJvcHMsXG4gICAgfSBhcyBTZXJ2aWNlQnVpbGQ7XG4gIH1cblxuICAvKipcbiAgICogV2hlbiB0aGlzIGhvb2sgaXMgaW1wbGVtZW50ZWQgYnkgZXh0ZW5zaW9uLCBpdCBhbGxvd3MgdGhlIGV4dGVuc2lvblxuICAgKiB0byB1c2UgdGhlIHNlcnZpY2Ugd2hpY2ggaGFzIGJlZW4gY3JlYXRlZC4gSXQgaXMgZ2VuZXJhbGx5IHVzZWQgdG9cbiAgICogY3JlYXRlIGFueSBmaW5hbCByZXNvdXJjZXMgd2hpY2ggbWlnaHQgZGVwZW5kIG9uIHRoZSBzZXJ2aWNlIGl0c2VsZi5cbiAgICpcbiAgICogQHBhcmFtIHNlcnZpY2UgLSBUaGUgZ2VuZXJhdGVkIHNlcnZpY2UuXG4gICAqL1xuICBwdWJsaWMgdXNlU2VydmljZShzZXJ2aWNlOiBlY3MuRWMyU2VydmljZSB8IGVjcy5GYXJnYXRlU2VydmljZSkge1xuICAgIHNlcnZpY2UgPSBzZXJ2aWNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgaG9vayBhbGxvd3MgdGhlIGV4dGVuc2lvbiB0byBlc3RhYmxpc2ggYSBjb25uZWN0aW9uIHRvXG4gICAqIGV4dGVuc2lvbnMgZnJvbSBhbm90aGVyIHNlcnZpY2UuIFVzdWFsbHkgdXNlZCBmb3IgdGhpbmdzIGxpa2VcbiAgICogYWxsb3dpbmcgb25lIHNlcnZpY2UgdG8gdGFsayB0byB0aGUgbG9hZCBiYWxhbmNlciBvciBzZXJ2aWNlIG1lc2hcbiAgICogcHJveHkgZm9yIGFub3RoZXIgc2VydmljZS5cbiAgICpcbiAgICogQHBhcmFtIHNlcnZpY2UgLSBUaGUgb3RoZXIgc2VydmljZSB0byBjb25uZWN0IHRvLlxuICAgKi9cbiAgcHVibGljIGNvbm5lY3RUb1NlcnZpY2Uoc2VydmljZTogU2VydmljZSwgY29ubmVjdFRvUHJvcHM6IENvbm5lY3RUb1Byb3BzKSB7XG4gICAgc2VydmljZSA9IHNlcnZpY2U7XG4gICAgY29ubmVjdFRvUHJvcHMgPSBjb25uZWN0VG9Qcm9wcztcbiAgfVxufVxuXG4vKipcbiAqIFRoaXMgaXMgYW4gYWJzdHJhY3QgY2xhc3Mgd3JhcHBlciBmb3IgYSBtdXRhdGluZyBob29rLiBJdCBpc1xuICogZXh0ZW5kZWQgYnkgYW55IGV4dGVuc2lvbiB3aGljaCB3YW50cyB0byBtdXRhdGUgb3RoZXIgZXh0ZW5zaW9uJ3MgY29udGFpbmVycy5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbnRhaW5lck11dGF0aW5nSG9vayB7XG4gIC8qKlxuICAgKiBUaGlzIGlzIGEgaG9vayBmb3IgbW9kaWZ5aW5nIHRoZSBjb250YWluZXIgZGVmaW5pdGlvbiBvZiBhbnkgdXBzdHJlYW1cbiAgICogY29udGFpbmVycy4gVGhpcyBpcyBwcmltYXJpbHkgdXNlZCBmb3IgdGhlIG1haW4gYXBwbGljYXRpb24gY29udGFpbmVyLlxuICAgKiBGb3IgZXhhbXBsZSwgdGhlIEZpcmVsZW5zIGV4dGVuc2lvbiB3YW50cyB0byBiZSBhYmxlIHRvIG1vZGlmeSB0aGUgbG9nZ2luZ1xuICAgKiBzZXR0aW5ncyBvZiB0aGUgYXBwbGljYXRpb24gY29udGFpbmVyLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvcHMgLSBUaGUgY29udGFpbmVyIGRlZmluaXRpb24gdG8gbXV0YXRlLlxuICAgKi9cbiAgcHVibGljIG11dGF0ZUNvbnRhaW5lckRlZmluaXRpb24ocHJvcHM6IGVjcy5Db250YWluZXJEZWZpbml0aW9uT3B0aW9ucyk6IGVjcy5Db250YWluZXJEZWZpbml0aW9uT3B0aW9ucyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnByb3BzLFxuICAgIH0gYXMgZWNzLkNvbnRhaW5lckRlZmluaXRpb25PcHRpb25zO1xuICB9XG59XG4iXX0=