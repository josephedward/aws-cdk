import * as ecs from '@aws-cdk/aws-ecs';
import { Construct } from 'constructs';
import { Service } from '../service';
import { ServiceExtension } from './extension-interfaces';
/**
 * This extension adds a CloudWatch agent to the task definition and
 * configures the task to be able to publish metrics to CloudWatch.
 */
export declare class CloudwatchAgentExtension extends ServiceExtension {
    private CW_CONFIG_CONTENT;
    constructor();
    prehook(service: Service, scope: Construct): void;
    useTaskDefinition(taskDefinition: ecs.TaskDefinition): void;
    resolveContainerDependencies(): void;
}
