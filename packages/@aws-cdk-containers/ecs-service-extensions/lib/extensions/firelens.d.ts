import * as ecs from '@aws-cdk/aws-ecs';
import * as awslogs from '@aws-cdk/aws-logs';
import { Construct } from 'constructs';
import { Service } from '../service';
import { ContainerMutatingHook, ServiceExtension } from './extension-interfaces';
/**
 * Settings for the hook which mutates the application container
 * to route logs through FireLens.
 */
export interface FirelensProps {
    /**
     * The parent service that is being mutated.
     */
    readonly parentService: Service;
    /**
     * The log group into which logs should be routed.
     */
    readonly logGroup: awslogs.LogGroup;
}
/**
 * This hook modifies the application container's settings so that
 * it routes logs using FireLens.
 */
export declare class FirelensMutatingHook extends ContainerMutatingHook {
    private parentService;
    private logGroup;
    constructor(props: FirelensProps);
    mutateContainerDefinition(props: ecs.ContainerDefinitionOptions): ecs.ContainerDefinitionOptions;
}
/**
 * This extension adds a FluentBit log router to the task definition
 * and does all the configuration necessarily to enable log routing
 * for the task using FireLens.
 */
export declare class FireLensExtension extends ServiceExtension {
    private logGroup;
    constructor();
    prehook(service: Service, scope: Construct): void;
    addHooks(): void;
    useTaskDefinition(taskDefinition: ecs.TaskDefinition): void;
    resolveContainerDependencies(): void;
}
