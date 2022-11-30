import * as ecs from '@aws-cdk/aws-ecs';
import * as awslogs from '@aws-cdk/aws-logs';
import { Construct } from 'constructs';
import { Service } from '../service';
import { ServiceExtension } from './extension-interfaces';
/**
 * Setting for the main application container of a service.
 */
export interface ContainerExtensionProps {
    /**
     * How much CPU the container requires.
     */
    readonly cpu: number;
    /**
     * How much memory in megabytes the container requires.
     */
    readonly memoryMiB: number;
    /**
     * The image to run.
     */
    readonly image: ecs.ContainerImage;
    /**
     * What port the image listen for traffic on.
     */
    readonly trafficPort: number;
    /**
     * Environment variables to pass into the container.
     *
     * @default - No environment variables.
     */
    readonly environment?: {
        [key: string]: string;
    };
    /**
     * The log group into which application container logs should be routed.
     *
     * @default - A log group is automatically created for you if the `ECS_SERVICE_EXTENSIONS_ENABLE_DEFAULT_LOG_DRIVER` feature flag is set.
     */
    readonly logGroup?: awslogs.ILogGroup;
}
/**
 * The main container of a service. This is generally the container
 * which runs your application business logic. Other extensions will attach
 * sidecars alongside this main container.
 */
export declare class Container extends ServiceExtension {
    /**
     * The port on which the container expects to receive network traffic
     */
    readonly trafficPort: number;
    /**
     * The log group into which application container logs should be routed.
     */
    logGroup?: awslogs.ILogGroup;
    /**
     * The settings for the container.
     */
    private props;
    constructor(props: ContainerExtensionProps);
    prehook(service: Service, scope: Construct): void;
    modifyTaskDefinitionProps(props: ecs.TaskDefinitionProps): ecs.TaskDefinitionProps;
    useTaskDefinition(taskDefinition: ecs.TaskDefinition): void;
    resolveContainerDependencies(): void;
}
